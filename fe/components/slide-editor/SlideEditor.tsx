// Shell của editor: TopBar + Canvas + SlideTray (nền xám) rồi BottomBar (trắng).

import { TopBar } from "./TopBar";
import { Canvas } from "./Canvas";
import { SlideTray } from "./SlideTray";
import { BottomBar } from "./BottomBar";

export function SlideEditor() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#edeff2]">
      <TopBar />
      <Canvas />
      <SlideTray />
      <BottomBar />
    </div>
  );
}
