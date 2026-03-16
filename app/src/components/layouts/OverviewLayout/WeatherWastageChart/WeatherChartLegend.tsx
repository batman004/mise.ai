import {
  WeatherCondition,
  WeatherConditionIcons,
  WeatherConditionNames,
} from "@/services/sales/sales.domain";
import type { Payload } from "recharts/types/component/DefaultLegendContent";

export interface WeatherChartLegendProps {
  payload?: Payload[] | undefined;
}

export function WeatherChartLegend({ payload }: WeatherChartLegendProps) {
  return (
    <ul className="flex flex-row gap-2 w-full items-center justify-center">
      {payload &&
        payload.map((item, index) => {
          const WeatherIcon =
            WeatherConditionIcons[item.value as WeatherCondition];
          return (
            <li
              key={index}
              style={{ color: item.color }}
              className="flex items-center gap-0.5"
            >
              <WeatherIcon className="size-4" />
              {WeatherConditionNames[item.value as WeatherCondition]}
            </li>
          );
        })}
    </ul>
  );
}
