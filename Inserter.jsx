import { addPropertyControls, ControlType } from "framer";

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 *
 * @framerIntrinsicWidth 300
 */

export default function Inserter(props) {
  const style = {
    color: props.primary.fill,
    WebkitTextStroke: `${props.primary.thicc}px ${props.primary.stroke}`,
    fontFamily: props.primary.font.fontFamily,
    fontSize: props.primary.size,
    fontWeight: props.primary.font.fontWeight,
    fontStyle: props.primary.font.fontStyle,
    lineHeight: {
      em: `${props.primary.lineEm}em`,
      px: `${props.primary.linePx}px`,
      "%": `${props.primary.linePercent}%`,
    }[props.primary.lineToggle],
    letterSpacing:
      props.primary.letterToggle === "em"
        ? `${props.primary.letterEm}em`
        : `${props.primary.letterPx}px`,
    fontVariationSettings: ["wght", "ital", "slnt", "opsz"]
      .filter((key) => props.primary[`${key}Toggle`] === "true")
      .map((key) => `"${key}" ${props.primary[key]}`)
      .join(", "),
    textDecorationLine: props.primary.decorationLine,
    textDecorationThickness: props.primary.decorationThickness,
    textDecorationColor: props.primary.decorationColor,
    whiteSpace: "pre-wrap",
  };

  const words = props.text.split(/(\s+)/);
  const itemsWithPositions = props.item
    .map((item, index) => ({
      item,
      position: Math.max(1, props.settings[index]?.position || 1),
      offset: props.settings[index]?.offset || 0,
    }))
    .sort((a, b) => a.position - b.position);

  const elements = [];
  let wordIndex = 0;
  let itemIndex = 0;

  while (wordIndex < words.length || itemIndex < itemsWithPositions.length) {
    if (
      itemIndex < itemsWithPositions.length &&
      itemsWithPositions[itemIndex].position <= Math.floor(wordIndex / 2) + 1
    ) {
      const isBeforeAllText = itemsWithPositions[itemIndex].position === 1;
      const isAfterAllText =
        itemsWithPositions[itemIndex].position > Math.ceil(words.length / 2);

      if (!isBeforeAllText && !isAfterAllText && wordIndex > 0) {
        const prevElement = elements.pop();
        const prevWord = prevElement.props.children;
        const lastSpaceIndex = prevWord.lastIndexOf(" ");

        if (lastSpaceIndex !== -1) {
          const wordPart = prevWord.slice(0, lastSpaceIndex);
          const spacePart = prevWord.slice(lastSpaceIndex);

          elements.push(
            <span key={`word-${wordIndex - 1}-part`} style={style}>
              {wordPart}
            </span>
          );
          elements.push(
            <span
              key={`space-before-item-${itemIndex}`}
              style={{
                ...style,
                textDecorationLine: "none",
                WebkitTextStroke: "0px transparent",
              }}
            >
              {spacePart}
            </span>
          );
        } else {
          elements.push(prevElement);
        }
      }

      if (isAfterAllText) {
        elements.push(
          <span
            key={`space-before-item-${itemIndex}`}
            style={{
              ...style,
              textDecorationLine: "none",
              WebkitTextStroke: "0px transparent",
            }}
          >
            {" "}
          </span>
        );
      }

      elements.push(
        <span
          key={`item-${itemIndex}`}
          style={{
            display: "inline-block",
            verticalAlign: "middle",
            height: 0,
            overflow: "visible",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: `translateY(calc(-50% - ${itemsWithPositions[itemIndex].offset}px))`,
            }}
          >
            {itemsWithPositions[itemIndex].item}
          </span>
        </span>
      );

      if (isBeforeAllText || !isAfterAllText) {
        elements.push(
          <span
            key={`space-after-item-${itemIndex}`}
            style={{
              ...style,
              textDecorationLine: "none",
              WebkitTextStroke: "0px transparent",
            }}
          >
            {" "}
          </span>
        );
      }

      itemIndex++;
    } else {
      elements.push(
        <span key={`word-${wordIndex}`} style={style}>
          {words[wordIndex]}
        </span>
      );
      wordIndex++;
    }
  }

  return (
    <div style={{ textAlign: props.align, width: "100%" }}>{elements}</div>
  );
}

Inserter.displayName = "Tau 1.1 - Inserter";

addPropertyControls(Inserter, {
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
  align: {
    type: ControlType.Enum,
    displaySegmentedControl: true,
    options: ["left", "center", "right"],
    optionIcons: ["text-align-left", "text-align-center", "text-align-right"],
    defaultValue: "left",
    description: " ",
  },
  item: {
    type: ControlType.Array,
    title: "Items",
    control: {
      type: ControlType.ComponentInstance,
    },
    maxCount: 5,
  },
  settings: {
    type: ControlType.Array,
    title: "Settings",
    control: {
      type: ControlType.Object,
      controls: {
        position: {
          type: ControlType.Number,
          title: "Position",
          defaultValue: 0,
          min: 1,
          step: 1,
          displayStepper: true,
        },
        offset: {
          type: ControlType.Number,
          title: "Offset",
          defaultValue: 0,
          step: 0.5,
          displayStepper: true,
        },
      },
    },
  },
});
