import { useEffect, useRef, useState } from "react";
import { addPropertyControls, ControlType, useIsOnFramerCanvas } from "framer";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

function calculateSpringTime(stiffness, damping, mass) {
  const settlingPercentage = 0.01;
  const naturalFrequency = Math.sqrt(stiffness / mass);
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));

  let settlingTime;

  if (dampingRatio < 1) {
    // Underdamped
    settlingTime =
      -Math.log(settlingPercentage) / (dampingRatio * naturalFrequency);
  } else if (dampingRatio === 1) {
    // Critically damped
    settlingTime = -Math.log(settlingPercentage) / naturalFrequency;
  } else {
    // Overdamped
    settlingTime =
      Math.abs(Math.log(settlingPercentage)) /
      (dampingRatio * naturalFrequency -
        Math.sqrt(dampingRatio * dampingRatio - 1) * naturalFrequency);
  }

  return Math.min(settlingTime, 1e10);
}

function interpolateValue(start, end, factor) {
  return start + (end - start) * factor;
}

function interpolateClipPath(startClip, endClip, factor) {
  const interpolatedValues = startClip.map((start, i) =>
    interpolateValue(start, endClip[i], factor)
  );

  return `inset(${interpolatedValues.map((v) => `${v}%`).join(" ")})`;
}

function splitTextIntoLines(
  text,
  textStyle,
  letterSpacing,
  fontVariationSettings,
  containerWidth
) {
  const words = text.split(" ");
  const lastWords = words.splice(-1).join(" ");
  words.push(lastWords);

  const tempLines = [];
  let currentLine = [];

  const measureSpan = document.createElement("span");
  document.body.appendChild(measureSpan);
  measureSpan.style.visibility = "hidden";
  measureSpan.style.fontFamily = textStyle.font.fontFamily || "Inter";
  measureSpan.style.fontSize = `${textStyle.size}px`;
  measureSpan.style.fontWeight = textStyle.font.fontWeight;
  measureSpan.style.fontStyle = textStyle.font.fontStyle;
  measureSpan.style.letterSpacing = letterSpacing;
  measureSpan.style.fontVariationSettings = fontVariationSettings;

  const measureWidth = (text) => {
    measureSpan.textContent = text;
    return measureSpan.offsetWidth;
  };

  words.forEach((word) => {
    const testLine = [...currentLine, word].join(" ");
    if (measureWidth(testLine) >= containerWidth) {
      tempLines.push(currentLine);
      currentLine = [word];
    } else {
      currentLine.push(word);
    }
  });

  if (currentLine.length) tempLines.push(currentLine);
  document.body.removeChild(measureSpan);
  return tempLines;
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 *
 * @framerIntrinsicWidth 300
 */

export default function HighlighterScroll(props) {
  const textRef = useRef(null);
  const [textState, setTextState] = useState({
    lines: [],
    clips: [],
  });

  const previewFac = useIsOnFramerCanvas() ? props.preview : 0;

  const { scrollYProgress } = useScroll();
  const [scrollRange, setScrollRange] = useState([0, 1]);

  useEffect(() => {
    const elementId = props.target.replace("#", "");
    const element = document.getElementById(elementId);
    if (!element) return;

    const updateScrollRange = () => {
      const pageHeight = document.documentElement.scrollHeight;
      const { top, height } = element.getBoundingClientRect();
      setScrollRange([top / pageHeight, (top + height) / pageHeight]);
    };

    const resizeObserver = new ResizeObserver(updateScrollRange);
    resizeObserver.observe(element);

    window.addEventListener("resize", updateScrollRange);
    updateScrollRange();

    return () => {
      window.removeEventListener("resize", updateScrollRange);
      resizeObserver.disconnect();
    };
  }, [props.target]);

  const sectionYProgress = useTransform(scrollYProgress, scrollRange, [0, 1]);
  const scrollValue =
    props.targetToggle === "page" ? scrollYProgress : sectionYProgress;
  const smoothScroll = useSpring(scrollValue, props.transition);

  const lineHeightV = {
    em: `${props.textStyle.lineEm}em`,
    px: `${props.textStyle.linePx}px`,
    "%": `${props.textStyle.linePercent}%`,
  };
  const lineHeight = lineHeightV[props.textStyle.lineToggle];

  const letterSpacingV = {
    em: `${props.textStyle.letterEm}em`,
    px: `${props.textStyle.letterPx}px`,
  };
  const letterSpacing = letterSpacingV[props.textStyle.letterToggle];

  const fontVariationSettings = ["wght", "ital", "slnt", "opsz"]
    .filter((key) => props.textStyle[`${key}Toggle`] === "true")
    .map((key) => `"${key}" ${props.textStyle[key]}`)
    .join(", ");

  useEffect(() => {
    if (!textRef.current) return;

    const handleResize = () => {
      const containerWidth = textRef.current.offsetWidth;
      const lines = splitTextIntoLines(
        props.text,
        props.textStyle,
        letterSpacing,
        fontVariationSettings,
        containerWidth
      );

      setTextState({
        lines,
        clips: lines.map(() => ({
          oneClip: `inset(-100% 0% -100% ${previewFac}%)`,
          twoClip: `inset(-100% ${100 - previewFac}% -100% 0%)`,
        })),
      });
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(textRef.current);

    return () => observer.disconnect();
  }, [props]);

  const duration =
    props.transition.type === "spring"
      ? calculateSpringTime(
          props.transition.stiffness,
          props.transition.damping,
          props.transition.mass
        )
      : props.transition.duration;

  useEffect(() => {
    const totalDuration =
      duration * (1 + (textState.lines.length - 1) * (props.lineStagger / 100));
    const lineAnimationTime = duration / totalDuration;
    const staggerFactor = props.lineStagger / 100;

    const unsubscribe = smoothScroll.on("change", (value) => {
      const updatedClips = textState.lines.map((_, lineIndex) => {
        const lineStart =
          (lineIndex * duration * staggerFactor) / totalDuration;
        const lineFactor = Math.min(
          Math.max((value - lineStart) / lineAnimationTime, 0),
          1
        );

        return {
          oneClip: interpolateClipPath(
            [-100, 0, -100, 0],
            [-100, 0, -100, 100],
            lineFactor
          ),
          twoClip: interpolateClipPath(
            [-100, 100, -100, 0],
            [-100, 0, -100, 0],
            lineFactor
          ),
        };
      });

      setTextState((prevState) => ({ ...prevState, clips: updatedClips }));
    });

    return () => unsubscribe();
  }, [smoothScroll, textState.lines.length, props.lineStagger, duration]);

  return (
    <div
      ref={textRef}
      style={{
        textAlign: props.align,
        fontFamily: props.textStyle.font.fontFamily || "Inter",
        fontSize: props.textStyle.size,
        fontWeight: props.textStyle.font.fontWeight,
        fontStyle: props.textStyle.font.fontStyle,
        lineHeight,
        letterSpacing,
      }}
    >
      <span
        style={{
          position: "absolute",
          clip: "rect(0, 0, 0, 0)",
        }}
      >
        {props.text}
      </span>
      {textState.lines.map((line, index) => (
        <motion.span
          key={`state2-${index}`}
          style={{
            display: "block",
            textDecorationLine: props.state2.decorationLine,
            textDecorationThickness: props.state2.decorationThickness,
            textDecorationColor: props.state2.decorationColor,
            fontVariationSettings,
            color: props.state2.fill,
            clipPath: textState.clips[index].twoClip,
            WebkitTextStroke: `${props.state2.thicc}px ${props.state2.stroke}`,
          }}
        >
          {line.join(" ")}
        </motion.span>
      ))}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
        }}
      >
        {textState.lines.map((line, index) => (
          <motion.span
            key={`state1-${index}`}
            style={{
              display: "block",
              textDecorationLine: props.state1.decorationLine,
              textDecorationThickness: props.state1.decorationThickness,
              textDecorationColor: props.state1.decorationColor,
              fontVariationSettings,
              color: props.state1.fill,
              clipPath: textState.clips[index].oneClip,
              WebkitTextStroke: `${props.state1.thicc}px ${props.state1.stroke}`,
            }}
          >
            {line.join(" ")}
          </motion.span>
        ))}
      </span>
    </div>
  );
}

HighlighterScroll.displayName = "Tau - Highlighter Scroll";

addPropertyControls(HighlighterScroll, {
  text: {
    type: ControlType.String,
    title: "Text",
    displayTextArea: true,
    defaultValue:
      "Delftware, the iconic blue and white pottery, originated in the 16th century in the Dutch town of Delft.",
  },
  textStyle: {
    type: ControlType.Object,
    title: "Text style",
    controls: {
      font: {
        type: ControlType.Font,
        title: "Font",
        defaultValue: {
          family: "Inter",
          fontWeight: "regular",
        },
      },
      size: {
        type: ControlType.Number,
        title: "Size",
        defaultValue: 18,
        step: 0.5,
        displayStepper: true,
        description: " ",
      },
      letterEm: {
        type: ControlType.Number,
        title: "Letter",
        defaultValue: 0,
        step: 0.01,
        displayStepper: true,
        hidden: (props) => props.letterToggle !== "em",
      },
      letterPx: {
        type: ControlType.Number,
        title: "Letter",
        defaultValue: 0,
        step: 0.1,
        displayStepper: true,
        hidden: (props) => props.letterToggle !== "px",
      },
      letterToggle: {
        type: ControlType.Enum,
        title: "Unit",
        displaySegmentedControl: true,
        options: ["em", "px"],
        optionTitles: ["Em", "Pixels"],
        defaultValue: "em",
        description: " ",
      },
      lineEm: {
        type: ControlType.Number,
        title: "Line",
        defaultValue: 1,
        min: 0.1,
        displayStepper: true,
        step: 0.1,
        hidden: (props) => props.lineToggle !== "em",
      },
      linePx: {
        type: ControlType.Number,
        title: "Line",
        defaultValue: 16,
        min: 0.1,
        displayStepper: true,
        step: 0.5,
        hidden: (props) => props.lineToggle !== "px",
      },
      linePercent: {
        type: ControlType.Number,
        title: "Line",
        defaultValue: 120,
        min: 0.1,
        displayStepper: true,
        step: 5,
        hidden: (props) => props.lineToggle !== "%",
      },
      lineToggle: {
        type: ControlType.Enum,
        title: "Unit",
        displaySegmentedControl: true,
        options: ["em", "px", "%"],
        optionTitles: ["Em", "Pixels", "%"],
        defaultValue: "%",
        description: " ",
      },
      wghtToggle: {
        type: ControlType.Enum,
        title: "Weight",
        displaySegmentedControl: true,
        options: ["false", "true"],
        optionTitles: ["Auto", "Custom"],
        defaultValue: "false",
      },
      wght: {
        type: ControlType.Number,
        title: "Weight",
        defaultValue: 200,
        min: 50,
        max: 1000,
        hidden: (props) => props.wghtToggle === "false",
      },
      italToggle: {
        type: ControlType.Enum,
        title: "Italic",
        displaySegmentedControl: true,
        options: ["false", "true"],
        optionTitles: ["Auto", "Custom"],
        defaultValue: "false",
      },
      ital: {
        type: ControlType.Number,
        title: "Italic",
        defaultValue: 200,
        step: 0.1,
        min: 0,
        max: 1,
        hidden: (props) => props.italToggle === "false",
      },
      slntToggle: {
        type: ControlType.Enum,
        title: "Slant",
        options: ["false", "true"],
        optionTitles: ["Auto", "Custom"],
        defaultValue: "false",
        displaySegmentedControl: true,
      },
      slnt: {
        type: ControlType.Number,
        title: "Slant",
        defaultValue: 200,
        min: 50,
        max: 1000,
        hidden: (props) => props.slntToggle === "false",
      },
      opszToggle: {
        type: ControlType.Enum,
        title: "Opt. size",
        options: ["false", "true"],
        optionTitles: ["Auto", "Custom"],
        defaultValue: "false",
        displaySegmentedControl: true,
      },
      opsz: {
        type: ControlType.Number,
        title: "Opt. size",
        defaultValue: 16,
        min: 6,
        max: 72,
        hidden: (props) => props.opszToggle === "false",
      },
    },
  },
  align: {
    type: ControlType.Enum,
    options: ["left", "center", "right"],
    optionIcons: ["text-align-left", "text-align-center", "text-align-right"],
    displaySegmentedControl: true,
    description: " ",
  },
  targetToggle: {
    type: ControlType.Enum,
    title: "Target",
    options: ["page", "section"],
    optionTitles: ["Page", "Section"],
    defaultValue: "page",
  },
  target: {
    type: ControlType.String,
    title: "Section",
    placeholder: "#example-section",
    hidden: (props) => props.targetToggle !== "section",
  },
  state1: {
    type: ControlType.Object,
    buttonTitle: "Customize...",
    title: "State 1",
    controls: {
      fill: {
        type: ControlType.Color,
        title: "Fill",
        defaultValue: "#000000",
      },
      stroke: {
        type: ControlType.Color,
        title: "Stroke",
        defaultValue: "#000000",
      },
      thicc: {
        type: ControlType.Number,
        title: "Thickness",
        defaultValue: 0,
        displayStepper: true,
        description: " ",
      },
      decorationLine: {
        type: ControlType.Enum,
        title: "Decoration",
        options: ["none", "underline", "line-through", "overline"],
        optionTitles: ["None", "Underline", "Strikethrough", "Overline"],
        defaultValue: "none",
      },
      decorationThickness: {
        type: ControlType.Number,
        title: "Thickness",
        defaultValue: 1,
        min: 1,
        displayStepper: true,
        hidden: (props) => props.decorationLine === "none",
      },
      decorationColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#000000",
        hidden: (props) => props.decorationLine === "none",
      },
    },
  },
  state2: {
    type: ControlType.Object,
    buttonTitle: "Customize...",
    title: "State 2",
    controls: {
      fill: {
        type: ControlType.Color,
        title: "Fill",
        defaultValue: "#1E2AD2",
      },
      stroke: {
        type: ControlType.Color,
        title: "Stroke",
        defaultValue: "#000000",
      },
      thicc: {
        type: ControlType.Number,
        title: "Thickness",
        defaultValue: 0,
        displayStepper: true,
        description: " ",
      },
      decorationLine: {
        type: ControlType.Enum,
        title: "Decoration",
        options: ["none", "underline", "line-through", "overline"],
        optionTitles: ["None", "Underline", "Strikethrough", "Overline"],
        defaultValue: "none",
      },
      decorationThickness: {
        type: ControlType.Number,
        title: "Thickness",
        defaultValue: 1,
        min: 1,
        displayStepper: true,
        hidden: (props) => props.decorationLine === "none",
      },
      decorationColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#000000",
        hidden: (props) => props.decorationLine === "none",
      },
    },
  },
  preview: {
    type: ControlType.Enum,
    displaySegmentedControl: true,
    title: "Preview",
    options: [0, 100],
    optionTitles: ["State 1", "State 2"],
    defaultValue: "state1",
    description: " ",
  },
  lineStagger: {
    type: ControlType.Number,
    title: "Line stagger",
    unit: "%",
    min: 0,
    max: 100,
    defaultValue: 50,
    displayStepper: true,
    step: 5,
  },
  transition: {
    type: ControlType.Transition,
    title: "Transition",
  },
});
