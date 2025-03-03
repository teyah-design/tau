import { useEffect, useRef, useState } from "react";
import { addPropertyControls, ControlType, useIsOnFramerCanvas } from "framer";
import { motion, useInView } from "framer-motion";

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

export default function AnimatorAppear(props) {
  const textRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [previousWordsCounts, setPreviousWordsCounts] = useState([]);

  const initialState = useIsOnFramerCanvas() ? props.preview : "state1";

  const startV = parseFloat(props.start);
  const options =
    props.trigger === "onAppear"
      ? { once: true }
      : { once: props.once === "true", amount: startV };
  const isInView = useInView(textRef, options);

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

  const duration =
    props.transition.type === "spring"
      ? calculateSpringTime(
          props.transition.stiffness,
          props.transition.damping,
          props.transition.mass
        )
      : props.transition.duration;

  const wordStagger = props.wordStagger / 100;
  const lineStagger = props.lineStagger / 100;

  const fontVariationSettings = ["wght", "ital", "slnt", "opsz"]
    .filter((key) => props.textStyle[`${key}Toggle`] === "true")
    .map((key) => `"${key}" ${props.textStyle[key]}`)
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

  useEffect(() => {
    const counts = lines.map((_, index) =>
      lines.slice(0, index).reduce((total, line) => total + line.length, 0)
    );
    setPreviousWordsCounts(counts);
  }, [lines]);

  const wordVariants = ["state1", "state2"].reduce((variants, state) => {
    variants[state] = {
      color: props[state].fill,
      WebkitTextStroke: `${props[state].thicc}px ${props[state].stroke}`,
      x: props[state].X,
      y: props[state].Y,
      rotateX: props[state].rotX,
      rotateY: props[state].rotY,
      rotateZ: props[state].rotZ,
      scale: props[state].scale,
      filter: `blur(${props[state].blur}px)`,
    };
    return variants;
  }, {});

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
      {lines.map((line, index) => (
        <div
          key={index}
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
          {line.map((word, wordIndex) => (
            <motion.span
              key={wordIndex}
              style={{
                display: "inline-block",
              }}
              initial={initialState}
              animate={isInView ? "state2" : "state1"}
              variants={wordVariants}
              transition={{
                ...props.transition,
                delay:
                  duration *
                    lineStagger *
                    interpolateValue(
                      index,
                      previousWordsCounts[index],
                      wordStagger
                    ) +
                  duration * wordStagger * wordIndex,
              }}
            >
              {word}
              {wordIndex < line.length - 1 && <span>&nbsp;</span>}
            </motion.span>
          ))}
        </div>
      ))}
    </div>
  );
}

AnimatorAppear.displayName = "Tau - Animator Appear";

addPropertyControls(AnimatorAppear, {
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
  trigger: {
    type: ControlType.Enum,
    title: "Trigger",
    options: ["onAppear", "layerInView"],
    optionTitles: ["On Appear", "Layer in View"],
    defaultValue: "onAppear",
  },
  start: {
    type: ControlType.Enum,
    title: "Start",
    displaySegmentedControl: true,
    options: ["0", "0.5", "1"],
    optionTitles: ["Top", "Center", "Bottom"],
    defaultValue: "0",
    hidden: (props) => props.trigger !== "layerInView",
  },
  once: {
    type: ControlType.Enum,
    title: "Replay",
    displaySegmentedControl: true,
    options: ["false", "true"],
    optionTitles: ["Yes", "No"],
    defaultValue: "false",
    hidden: (props) => props.trigger !== "layerInView",
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
      X: {
        type: ControlType.Number,
        title: "Offset X",
        unit: "%",
        defaultValue: 0,
        min: -200,
        max: 200,
        displayStepper: true,
        step: 5,
      },
      Y: {
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
        defaultValue: "#000000",
      },
      thicc: {
        type: ControlType.Number,
        title: "Thickness",
        defaultValue: 0,
        displayStepper: true,
        description: " ",
      },
      X: {
        type: ControlType.Number,
        title: "Offset X",
        unit: "%",
        defaultValue: 0,
        min: -200,
        max: 200,
        displayStepper: true,
        step: 5,
      },
      Y: {
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
