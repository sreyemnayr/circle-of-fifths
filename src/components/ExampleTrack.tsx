import { IExampleTrack } from "@/types";

export const ExampleTrack = ({ artist, name, img, value }: IExampleTrack) => {
  return (
    <div className="flex flex-row items-center">
      <div className="text-xs mr-2.5">{value}</div>
      <img src={img} className="h-[30px] mr-2.5" alt="" />
      <div className="flex flex-col items-start">
        <div>{name}</div>
        <div className="text-sm italic">{artist}</div>
      </div>
    </div>
  );
};
