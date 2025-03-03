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

function parseColor(color) {
  const div = document.createElement("div");
  div.style.color = color;
  document.body.appendChild(div);
  const rgba = getComputedStyle(div)
    .color.match(/[\d.]+/g)
    .map(Number);
  document.body.removeChild(div);
  return rgba.length === 3 ? [...rgba, 1] : rgba;
}

function interpolateValue(start, end, factor) {
  return start + (end - start) * factor;
}

function interpolateColor(color1, color2, factor) {
  const [r1, g1, b1, a1] = parseColor(color1);
  const [r2, g2, b2, a2] = parseColor(color2);

  return `rgba(${interpolateValue(r1, r2, factor)}, ${interpolateValue(
    g1,
    g2,
    factor
  )}, ${interpolateValue(b1, b2, factor)}, ${interpolateValue(
    a1,
    a2,
    factor
  )})`;
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

export default function AnimatorScroll(props) {
  const textRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [currentState, setCurrentState] = useState([]);

  const initialState = useIsOnFramerCanvas() ? props.preview : "state1";

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

  const fontSettings = {
    wght: {
      value: props.textStyle.wght,
      apply: props.textStyle.wghtToggle,
    },
    ital: {
      value: props.textStyle.ital,
      apply: props.textStyle.italToggle,
    },
    slnt: {
      value: props.textStyle.slnt,
      apply: props.textStyle.slntToggle,
    },
    opsz: {
      value: props.textStyle.opsz,
      apply: props.textStyle.opszToggle,
    },
  };

  const fontVariationSettings = Object.entries(fontSettings)
    .filter(([, setting]) => setting.apply === "true")
    .map(([key, setting]) => `"${key}" ${setting.value}`)
    .join(", ");

  useEffect(() => {
    if (!textRef.current) return;

    const measureAndSplitText = () => {
      const lines = splitTextIntoLines(
        props.text,
        props.textStyle,
        letterSpacing,
        fontVariationSettings,
        textRef.current.offsetWidth
      );
      setLines(lines);
    };

    const observer = new ResizeObserver(measureAndSplitText);
    measureAndSplitText();
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
    const lineStaggerFraction = props.lineStagger / 100;
    const wordStaggerFraction = props.wordStagger / 100;
    const totalDuration =
      duration * (1 + (lines.length - 1) * lineStaggerFraction);

    const interpolators = {
      fill: interpolateColor,
      stroke: interpolateColor,
      thicc: interpolateValue,
      x: interpolateValue,
      y: interpolateValue,
      rotX: interpolateValue,
      rotY: interpolateValue,
      rotZ: interpolateValue,
      scale: interpolateValue,
      blur: interpolateValue,
    };

    setCurrentState(
      lines.map((line) => line.map(() => ({ ...props[initialState] })))
    );

    const unsubscribe = smoothScroll.on("change", (value) => {
      const updatedLines = lines.map((words, lineIndex) => {
        const lineStart = lineIndex * lineStaggerFraction * duration;

        return words.map((_, wordIndex) => {
          const denominator = 1 + (words.length - 1) * wordStaggerFraction;
          const wordAnimationTime = duration / denominator;
          const wordStart =
            lineStart + wordIndex * wordStaggerFraction * wordAnimationTime;

          const elapsed = value * totalDuration - wordStart;
          const wordFactor = Math.min(
            Math.max(elapsed / wordAnimationTime, 0),
            1
          );

          return Object.fromEntries(
            Object.keys(interpolators).map((prop) => [
              prop,
              interpolators[prop](
                props.state1[prop],
                props.state2[prop],
                wordFactor
              ),
            ])
          );
        });
      });
      setCurrentState(updatedLines);
    });

    return () => unsubscribe();
  }, [lines, props]);

  return (
    <div ref={textRef}>
      <span
        // SCREENREADER-ONLY
        style={{
          position: "absolute",
          clip: "rect(0, 0, 0, 0)",
        }}
      >
        {props.text}
      </span>
      {lines.map((line, lineIndex) => (
        <div
          key={lineIndex}
          aria-hidden="true"
          style={{
            overflow: props.overflow,
            textAlign: props.align,
            fontFamily: props.textStyle.font.fontFamily || "Inter",
            fontSize: props.textStyle.size,
            fontWeight: props.textStyle.font.fontWeight,
            fontStyle: props.textStyle.font.fontStyle,
            lineHeight,
            letterSpacing,
            textDecoration: "none",
            fontVariationSettings,
          }}
        >
          {line.map((word, wordIndex) => {
            const wordState =
              (currentState[lineIndex] && currentState[lineIndex][wordIndex]) ||
              {};
            const style = {
              display: "inline-block",
              color: wordState.fill,
              WebkitTextStroke: `${wordState.thicc}px ${wordState.stroke}`,
              transform: `
            translateX(${wordState.x}px) 
            translateY(${wordState.y}px) 
            rotateX(${wordState.rotX}deg) 
            rotateY(${wordState.rotY}deg) 
            rotateZ(${wordState.rotZ}deg) 
            scale(${wordState.scale})
        `,
              filter: `blur(${wordState.blur}px)`,
            };

            return (
              <motion.span key={wordIndex} style={style}>
                {word}
                {wordIndex < line.length - 1 && <span>&nbsp;</span>}
              </motion.span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

AnimatorScroll.displayName = "Tau - Animator Scroll";

addPropertyControls(AnimatorScroll, {
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
        displaySegmentedControl: true,
        options: ["false", "true"],
        optionTitles: ["Auto", "Custom"],
        defaultValue: "false",
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
        displaySegmentedControl: true,
        options: ["false", "true"],
        optionTitles: ["Auto", "Custom"],
        defaultValue: "false",
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
  overflow: {
    type: ControlType.Enum,
    title: "Overflow",
    options: ["visible", "hidden"],
    optionTitles: ["Visible", "Hidden"],
    defaultValue: "hidden",
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
      x: {
        type: ControlType.Number,
        title: "Offset X",
        unit: "%",
        defaultValue: 0,
        min: -200,
        max: 200,
        displayStepper: true,
        step: 5,
      },
      y: {
        type: ControlType.Number,
        title: "Offset Y",
        unit: "%",
        defaultValue: 10,
        min: -200,
        max: 200,
        displayStepper: true,
        step: 5,
      },
      rotX: {
        type: ControlType.Number,
        title: "Rotate X",
        unit: "°",
        defaultValue: 0,
        min: -360,
        max: 360,
      },
      rotY: {
        type: ControlType.Number,
        title: "Rotate Y",
        unit: "°",
        defaultValue: 0,
        min: -360,
        max: 360,
      },
      rotZ: {
        type: ControlType.Number,
        title: "Rotate Z",
        unit: "°",
        defaultValue: 0,
        min: -360,
        max: 360,
      },
      scale: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 1,
        displayStepper: true,
        step: 0.05,
      },
      blur: {
        type: ControlType.Number,
        title: "Blur",
        defaultValue: 0,
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
        defaultValue: "#1E2AD2",
      },
      thicc: {
        type: ControlType.Number,
        title: "Thickness",
        defaultValue: 0,
        displayStepper: true,
        description: " ",
      },
      x: {
        type: ControlType.Number,
        title: "Offset X",
        unit: "%",
        defaultValue: 0,
        min: -200,
        max: 200,
        displayStepper: true,
        step: 5,
      },
      y: {
        type: ControlType.Number,
        title: "Offset Y",
        unit: "%",
        defaultValue: 0,
        min: -200,
        max: 200,
        displayStepper: true,
        step: 5,
      },
      rotX: {
        type: ControlType.Number,
        title: "Rotate X",
        unit: "°",
        defaultValue: 0,
        min: -360,
        max: 360,
      },
      rotY: {
        type: ControlType.Number,
        title: "Rotate Y",
        unit: "°",
        defaultValue: 0,
        min: -360,
        max: 360,
      },
      rotZ: {
        type: ControlType.Number,
        title: "Rotate Z",
        unit: "°",
        defaultValue: 0,
        min: -360,
        max: 360,
      },
      scale: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 1,
        displayStepper: true,
        step: 0.05,
      },
      blur: {
        type: ControlType.Number,
        title: "Blur",
        defaultValue: 0,
      },
    },
  },
  preview: {
    type: ControlType.Enum,
    displaySegmentedControl: true,
    title: "Preview",
    options: ["state1", "state2"],
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
  wordStagger: {
    type: ControlType.Number,
    title: "Word stagger",
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
