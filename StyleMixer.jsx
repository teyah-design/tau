import { addPropertyControls, ControlType } from "framer";

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 *
 * @framerIntrinsicWidth 300
 */

export default function StyleMixer(props) {
  const renderWord = (word, index) => {
    const sec = props.secondary.find(
      (s) => index >= s.start - 1 && index < s.start + s.length - 1
    );
    const style = sec || props.primary;

    const commonStyle = {
      color: style.fill,
      WebkitTextStroke: `${style.thicc}px ${style.stroke}`,
      fontFamily: style.font.fontFamily,
      fontSize:
        sec && sec.verticalAlign !== "baseline"
          ? `${parseFloat(sec.size)}px`
          : style.size,
      fontWeight: style.font.fontWeight,
      fontStyle: style.font.fontStyle,
      lineHeight:
        sec && (sec.verticalAlign === "super" || sec.verticalAlign === "sub")
          ? 0
          : {
              em: `${props.primary.lineEm}em`,
              px: `${props.primary.linePx}px`,
              "%": `${props.primary.linePercent}%`,
            }[props.primary.lineToggle],
      letterSpacing:
        style.letterToggle === "em"
          ? `${style.letterEm}em`
          : `${style.letterPx}px`,
      fontVariationSettings:
        ["wght", "ital", "slnt", "opsz"]
          .filter((key) => style[`${key}Toggle`] === "true")
          .map((key) => `"${key}" ${style[key]}`)
          .join(", ") || "normal",
      transform: sec ? `translateY(-${sec.verticalOffset}px)` : "none",
      textDecorationLine: style.decorationLine,
      textDecorationThickness: style.decorationThickness,
      textDecorationColor: style.decorationColor,
      display: "inline-block",
    };

    return (
      <span key={`word-${index}`} style={commonStyle}>
        {word}
      </span>
    );
  };

  return (
    <span style={{ display: "inline-block", textAlign: props.align }}>
      {props.text.split(/\s+/).reduce((acc, word, index, arr) => {
        const currentSec = props.secondary.find(
          (s) => index >= s.start - 1 && index < s.start + s.length - 1
        );
        const nextSec = props.secondary.find(
          (s) => index + 1 >= s.start - 1 && index + 1 < s.start + s.length - 1
        );

        const wordStyle = renderWord(word, index).props.style;
        const spaceStyle =
          currentSec === nextSec ? {} : { textDecorationLine: "none" };

        const Element =
          currentSec && ["super", "sub"].includes(currentSec.verticalAlign)
            ? currentSec.verticalAlign === "super"
              ? "sup"
              : "sub"
            : "span";

        acc.push(
          <Element key={`word-${index}`} style={wordStyle}>
            {word}
            {index !== arr.length - 1 && currentSec === nextSec && "\u00A0"}
          </Element>
        );

        if (index !== arr.length - 1 && currentSec !== nextSec) {
          acc.push(
            <Element
              key={`space-${index}`}
              style={{ ...wordStyle, ...spaceStyle }}
            >
              {"\u00A0"}
            </Element>
          );
        }

        return acc;
      }, [])}
    </span>
  );
}

StyleMixer.displayName = "Tau - Style Mixer";

addPropertyControls(StyleMixer, {
  text: {
    type: ControlType.String,
    title: "Text",
    displayTextArea: true,
    defaultValue:
      "Delftware, the iconic blue and white pottery, originated in the 16th century in the Dutch town of Delft.",
  },
  primary: {
    type: ControlType.Object,
    title: "Primary",
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
        min: 0,
        defaultValue: 0,
        displayStepper: true,
        description: " ",
      },
      font: {
        type: ControlType.Font,
        title: "Font",
        defaultValue: {
          family: "Inter",
          fontWeight: "regular",
          fontStyle: "normal",
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
        defaultValue: 0,
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
  secondary: {
    type: ControlType.Array,
    title: "Secondary",
    control: {
      type: ControlType.Object,
      buttonTitle: "Style",
      controls: {
        start: {
          type: ControlType.Number,
          title: "Start:",
          min: 1,
          displayStepper: true,
          step: 1,
          defaultValue: 1,
        },
        length: {
          type: ControlType.Number,
          title: "Length:",
          min: 1,
          displayStepper: true,
          step: 1,
          defaultValue: 1,
          description: " ",
        },
        fill: {
          type: ControlType.Color,
          title: "Fill",
          defaultValue: "#0000ff",
        },
        stroke: {
          type: ControlType.Color,
          title: "Stroke",
          defaultValue: "#000000",
        },
        thicc: {
          type: ControlType.Number,
          title: "Thickness",
          min: 0,
          defaultValue: 0,
          displayStepper: true,
          description: " ",
        },
        font: {
          type: ControlType.Font,
          title: "Font",
          defaultValue: {
            family: "Inter",
            fontWeight: "regular",
            fontStyle: "normal",
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
        verticalAlign: {
          type: ControlType.Enum,
          title: "Alignment",
          options: ["baseline", "super", "sub"],
          optionTitles: ["Normal", "Superscript", "Subscript"],
          defaultValue: "baseline",
        },
        verticalOffset: {
          type: ControlType.Number,
          title: "Offset",
          defaultValue: 0,
          displayStepper: true,
          step: 0.5,
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
          defaultValue: 0,
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
  },
  align: {
    type: ControlType.Enum,
    displaySegmentedControl: true,
    options: ["left", "center", "right"],
    optionIcons: ["text-align-left", "text-align-center", "text-align-right"],
    defaultValue: "left",
  },
});
