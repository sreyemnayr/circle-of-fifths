import React, { useState, useEffect, useRef } from "react";
import { RecommendationsRequest } from "@spotify/web-api-ts-sdk";
import { OptionSettings, option_settings } from "./OptionsSliders";

interface Point {
  x: number;
  y: number;
}

interface DimensionLine {
  start: Point;
  end: Point;
  option: OptionSettings;
}

const OptionsMultidimensional: React.FC<{
  setFilters: React.Dispatch<React.SetStateAction<RecommendationsRequest>>;
  ignore?: string[];
}> = ({ setFilters, ignore }) => {
  const [activeOptions, setActiveOptions] = useState<OptionSettings[]>(
    option_settings
      .filter((option) => !ignore || !ignore.includes(option.key))
      .map((option) => ({ ...option, target: false }))
  );
  const [dimensions, setDimensions] = useState<DimensionLine[]>([]);
  const [values, setValues] = useState<{ [key: string]: [number, number] }>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState(400);
  const [hoveredOption, setHoveredOption] = useState<OptionSettings | null>(
    null
  );

  const padding = 40;
  const centerRadius = svgSize / 48;
  const zeroRadius = svgSize / 6;

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const newSize = Math.min(width, height);
        setSvgSize(newSize);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const angleStep = (2 * Math.PI) / activeOptions.length;
    const newDimensions = activeOptions.map((option, index) => {
      const angle = index * angleStep;
      return {
        start: {
          x: svgSize / 2 + Math.cos(angle) * zeroRadius,
          y: svgSize / 2 + Math.sin(angle) * zeroRadius,
        },
        end: {
          x: svgSize / 2 + Math.cos(angle) * ((svgSize - padding * 2) / 2),
          y: svgSize / 2 + Math.sin(angle) * ((svgSize - padding * 2) / 2),
        },
        option,
      };
    });
    setDimensions(newDimensions);

    const newValues = activeOptions.reduce((acc, option) => {
      acc[option.key] = [option.range[0], option.range[1]];
      return acc;
    }, {} as { [key: string]: [number, number] });
    setValues(newValues);
  }, [activeOptions, svgSize]);

  useEffect(() => {
    setFilters((prev) => {
      const newFilters = { ...prev } as { [key: string]: number | undefined };
      Object.entries(values).forEach(([key, value]) => {
        const option = activeOptions.find((opt) => opt.key === key);
        if (option?.target) {
          newFilters[`target_${key}`] = (value[0] + value[1]) / 2;
        } else {
          newFilters[`min_${key}`] = value[0];
          newFilters[`max_${key}`] = value[1];
        }
      });
      return newFilters as RecommendationsRequest;
    });
  }, [values, activeOptions, setFilters]);

  const handleDrag = (key: string, newValue: number, index?: number) => {
    setValues((prev) => {
      const currentValue = [...(prev[key] || [0, 0])] as [number, number];
      const option = activeOptions.find((opt) => opt.key === key);

      let updatedValue: [number, number];
      if (option?.target) {
        updatedValue = [newValue, newValue];
      } else if (index === undefined) {
        const midpoint = (currentValue[0] + currentValue[1]) / 2;
        updatedValue =
          newValue < midpoint
            ? [Math.min(newValue, currentValue[1]), currentValue[1]]
            : [currentValue[0], Math.max(newValue, currentValue[0])];
      } else {
        if (index === 0) {
          // Updating min value
          updatedValue = [Math.min(newValue, currentValue[1]), currentValue[1]];
        } else {
          // Updating max value
          updatedValue = [currentValue[0], Math.max(newValue, currentValue[0])];
        }
      }

      return { ...prev, [key]: updatedValue };
    });
  };

  const handleDoubleClick = (option: OptionSettings) => {
    setActiveOptions((prev) =>
      prev.map((opt) =>
        opt.key === option.key ? { ...opt, target: !opt.target } : opt
      )
    );
  };

  const interpolatePoint = (start: Point, end: Point, t: number): Point => ({
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  });

  const handleLineClick = (
    event: React.MouseEvent<SVGLineElement>,
    dim: DimensionLine
  ) => {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const clickX = event.clientX - svgRect.left;
    const clickY = event.clientY - svgRect.top;

    const dx = dim.end.x - dim.start.x;
    const dy = dim.end.y - dim.start.y;
    const t =
      ((clickX - dim.start.x) * dx + (clickY - dim.start.y) * dy) /
      (dx * dx + dy * dy);

    if (t >= 0 && t <= 1) {
      const value =
        t * (dim.option.range[1] - dim.option.range[0]) + dim.option.range[0];
      handleDrag(dim.option.key, value);
    }
  };

  const getEmoji = (option: OptionSettings, value: number) => {
    if (option.emoji_scale) {
      const index = Math.floor(
        ((value - option.range[0]) / (option.range[1] - option.range[0])) *
          (option.emoji_scale.length - 1)
      );
      return option.emoji_scale[index] || "🔵";
    }
    return "🔵";
  };

  const calculatePosition = (
    start: Point,
    end: Point,
    value: number,
    range: [number, number]
  ) => {
    const t = (value - range[0]) / (range[1] - range[0]);
    const adjustedT =
      t * (1 - centerRadius / (svgSize / 2 - padding)) +
      centerRadius / (svgSize / 2 - padding);
    return {
      x: start.x + (end.x - start.x) * adjustedT,
      y: start.y + (end.y - start.y) * adjustedT,
    };
  };

  const calculateEmojiPosition = (
    start: Point,
    end: Point,
    isOuter: boolean
  ) => {
    const value = isOuter ? 1 : 0;
    const range: [number, number] = [0, 1];
    const t = (value - range[0]) / (range[1] - range[0]);
    const adjustedT =
      t * (1 - centerRadius / 2 / (svgSize / 2 - padding)) +
      centerRadius / 2 / (svgSize / 2 - padding);
    return {
      x: start.x + (end.x - start.x) * adjustedT,
      y: start.y + (end.y - start.y) * adjustedT,
    };
  };

  const getPolygonPoints = () => {
    if (dimensions.length === 0 || Object.keys(values).length === 0) return "";

    const highPoints: Point[] = [];
    const lowPoints: Point[] = [];

    dimensions.forEach((dim) => {
      const option =
        activeOptions.find((opt) => opt.key === dim.option.key) || dim.option;
      const value = values[option.key];
      if (!value) return;

      if (option.target) {
        const midValue = (value[0] + value[1]) / 2;
        const point = calculatePosition(
          dim.start,
          dim.end,
          midValue,
          option.range
        );
        highPoints.push(point);
        lowPoints.push(point);
      } else {
        highPoints.push(
          calculatePosition(dim.start, dim.end, value[1], option.range)
        );
        lowPoints.push(
          calculatePosition(dim.start, dim.end, value[0], option.range)
        );
      }
    });

    const highPath = getCurvedPath(highPoints);
    const lowPath = getCurvedPath(lowPoints.reverse());

    return `${highPath} ${lowPath}`;
  };

  const getCurvedPath = (points: Point[]): string => {
    if (points.length < 2) return "";

    const curveCommand = (p1: Point, p2: Point, p3: Point) => {
      const midX1 = (p1.x + p2.x) / 2;
      const midY1 = (p1.y + p2.y) / 2;
      const midX2 = (p2.x + p3.x) / 2;
      const midY2 = (p2.y + p3.y) / 2;
      return `Q ${p2.x},${p2.y} ${midX2},${midY2}`;
    };

    let path = `M ${(points[0]!.x + points[points.length - 1]!.x) / 2},${
      (points[0]!.y + points[points.length - 1]!.y) / 2
    }`;

    for (let i = 0; i < points.length; i++) {
      const p1 = points[(i - 1 + points.length) % points.length];
      const p2 = points[i];
      const p3 = points[(i + 1) % points.length];
      path += ` ${curveCommand(p1!, p2!, p3!)}`;
    }

    path += " Z"; // Close the path

    return path;
  };

  useEffect(() => {
    console.log("Polygon points:", getPolygonPoints());
  }, [dimensions, values]);

  const handlePointerDown = (
    event: React.PointerEvent,
    dim: DimensionLine,
    option: OptionSettings,
    index?: number
  ) => {
    event.preventDefault();
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const pointerX = moveEvent.clientX - svgRect.left;
      const pointerY = moveEvent.clientY - svgRect.top;
      const t =
        ((pointerX - dim.start.x) * (dim.end.x - dim.start.x) +
          (pointerY - dim.start.y) * (dim.end.y - dim.start.y)) /
        ((dim.end.x - dim.start.x) ** 2 + (dim.end.y - dim.start.y) ** 2);
      const newValue =
        dim.option.range[0] + t * (dim.option.range[1] - dim.option.range[0]);
      handleDrag(
        dim.option.key,
        Math.max(dim.option.range[0], Math.min(dim.option.range[1], newValue)),
        index
      );
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handleLinePointerDown = (
    event: React.PointerEvent<SVGLineElement>,
    dim: DimensionLine
  ) => {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const clickX = event.clientX - svgRect.left;
    const clickY = event.clientY - svgRect.top;

    const dx = dim.end.x - dim.start.x;
    const dy = dim.end.y - dim.start.y;
    const t =
      ((clickX - dim.start.x) * dx + (clickY - dim.start.y) * dy) /
      (dx * dx + dy * dy);

    if (t >= 0 && t <= 1) {
      const value =
        t * (dim.option.range[1] - dim.option.range[0]) + dim.option.range[0];
      handleDrag(dim.option.key, value);
    }
  };

  const handlePointerEnter = (option: OptionSettings) => {
    setHoveredOption(option);
  };

  const handlePointerLeave = () => {
    setHoveredOption(null);
  };

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", aspectRatio: "1/1" }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        preserveAspectRatio="xMidYMid meet"
        className="bg-gray-100 rounded-lg"
      >
        <defs>
          <radialGradient
            id="blueGreenGradient"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor="rgba(173, 50, 230, 0.6)" />
            <stop offset="30%" stopColor="rgba(173, 216, 230, 0.6)" />
            <stop offset="70%" stopColor="rgba(242, 238, 66, 0.6)" />
            <stop offset="100%" stopColor="rgba(242, 32, 66, 0.6)" />
          </radialGradient>

          <mask id="polygonMask">
            <path d={getPolygonPoints()} fill="white" />
          </mask>
        </defs>

        {dimensions.length > 0 && (
          <>
            <rect
              x="0"
              y="0"
              width={svgSize}
              height={svgSize}
              fill="url(#blueGreenGradient)"
              mask="url(#polygonMask)"
            />
            <path
              d={getPolygonPoints()}
              fill="none"
              stroke="rgba(59, 130, 246, 0.4)"
              strokeWidth="2"
              className="pointer-events-none"
            />
          </>
        )}

        {dimensions.map((dim) => {
          const option =
            activeOptions.find((opt) => opt.key === dim.option.key) ||
            dim.option;
          const value = values[option.key];
          const isHovered = hoveredOption?.key === option.key;

          const innerEmojiPosition = calculateEmojiPosition(
            dim.start,
            dim.end,
            false
          );
          const outerEmojiPosition = calculateEmojiPosition(
            dim.start,
            dim.end,
            true
          );

          return (
            <React.Fragment key={option.key}>
              {/* Visible line */}
              <line
                x1={dim.start.x}
                y1={dim.start.y}
                x2={dim.end.x}
                y2={dim.end.y}
                stroke="rgba(59, 130, 246, 0.2)"
                strokeWidth="1"
                opacity={isHovered ? 1 : 0.01}
              />
              {!option.target && Array.isArray(value) && (
                <>
                  <line
                    x1={
                      calculatePosition(
                        dim.start,
                        dim.end,
                        value[0],
                        option.range
                      ).x
                    }
                    y1={
                      calculatePosition(
                        dim.start,
                        dim.end,
                        value[0],
                        option.range
                      ).y
                    }
                    x2={
                      calculatePosition(
                        dim.start,
                        dim.end,
                        value[1],
                        option.range
                      ).x
                    }
                    y2={
                      calculatePosition(
                        dim.start,
                        dim.end,
                        value[1],
                        option.range
                      ).y
                    }
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="3"
                    className="cursor-pointer"
                    opacity={isHovered ? 1 : 0.02}
                  />
                </>
              )}
              {/* Invisible, wider line for easier interaction */}

              <line
                x1={dim.start.x}
                y1={dim.start.y}
                x2={dim.end.x}
                y2={dim.end.y}
                stroke="transparent"
                strokeWidth="40"
                className="cursor-pointer"
                onPointerDown={(e) => handleLinePointerDown(e, dim)}
                onPointerEnter={() => handlePointerEnter(option)}
                onPointerLeave={handlePointerLeave}
              />

              {/* Inner emoji */}
              {isHovered && (
                <text
                  x={innerEmojiPosition.x}
                  y={innerEmojiPosition.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="20"
                  className="select-none pointer-events-none"
                  opacity={isHovered || hoveredOption === null ? 1 : 0.6}
                >
                  {getEmoji(option, values[option.key]?.[0] || option.range[0])}
                </text>
              )}

              {/* Outer emoji */}
              {isHovered && (
                <text
                  x={outerEmojiPosition.x}
                  y={outerEmojiPosition.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="20"
                  className="select-none pointer-events-none"
                  opacity={isHovered || hoveredOption === null ? 1 : 0.6}
                >
                  {getEmoji(option, values[option.key]?.[1] || option.range[1])}
                </text>
              )}

              {option.target && isHovered ? (
                <circle
                  cx={
                    calculatePosition(
                      dim.start,
                      dim.end,
                      ((value as [number, number])[0] +
                        (value as [number, number])[1]) /
                        2,
                      option.range
                    ).x
                  }
                  cy={
                    calculatePosition(
                      dim.start,
                      dim.end,
                      ((value as [number, number])[0] +
                        (value as [number, number])[1]) /
                        2,
                      option.range
                    ).y
                  }
                  r="6"
                  fill="rgb(59, 130, 246)"
                  className="cursor-move"
                  onPointerDown={(e) => handlePointerDown(e, dim, option)}
                  onDoubleClick={() => handleDoubleClick(option)}
                  onPointerEnter={() => handlePointerEnter(option)}
                  onPointerLeave={handlePointerLeave}
                />
              ) : (
                isHovered &&
                (value as [number, number]).map((v, i) => {
                  const position = calculatePosition(
                    dim.start,
                    dim.end,
                    v,
                    option.range
                  );
                  return (
                    <circle
                      key={`${option.key}-${i}`}
                      cx={position.x}
                      cy={position.y}
                      r="6"
                      fill="rgb(59, 130, 246)"
                      className="cursor-move"
                      onPointerDown={(e) =>
                        handlePointerDown(e, dim, option, i)
                      }
                      onDoubleClick={() => handleDoubleClick(option)}
                      onPointerEnter={() => handlePointerEnter(option)}
                      onPointerLeave={handlePointerLeave}
                    />
                  );
                })
              )}
            </React.Fragment>
          );
        })}

        {/* Add the center label */}
        {hoveredOption && (
          <text
            x={svgSize / 2}
            y={svgSize / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="16"
            fill="rgb(59, 130, 246)"
            className="select-none pointer-events-none"
          >
            {hoveredOption.label}
          </text>
        )}
      </svg>
    </div>
  );
};

export default OptionsMultidimensional;
