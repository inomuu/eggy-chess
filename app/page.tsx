import GameBoard from "@/components/game-board"
import GameRules from "@/components/game-rules"
import TrainerBoard from "@/components/trainer-board"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  return (
    <main
      className="h-screen overflow-hidden flex flex-col p-2 md:p-3"
      style={{ background: 'linear-gradient(160deg, #74C0FC 0%, #B2EBF2 50%, #C8F9C0 100%)' }}
    >
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full min-h-0">

        {/* Header */}
        <header className="text-center py-2 shrink-0">
          <h1 className="font-pixel text-xl md:text-2xl leading-none">
            <span style={{
              color: '#4D96FF',
              textShadow: '-2px -2px 0 white, 2px -2px 0 white, -2px 2px 0 white, 2px 2px 0 white, 4px 4px 0 #2D3436',
            }}>EGGY </span>
            <span style={{
              color: '#FF6584',
              textShadow: '-2px -2px 0 white, 2px -2px 0 white, -2px 2px 0 white, 2px 2px 0 white, 4px 4px 0 #2D3436',
            }}>CHESS</span>
          </h1>
          <div className="font-pixel text-[7px] mt-1.5" style={{ color: '#6C5CE7', textShadow: '1px 1px 0 white' }}>
            TIC · TAC · TOC
          </div>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="play" className="flex flex-col min-h-0 flex-1">
          <TabsList
            className="grid w-full grid-cols-3 mb-2 p-1.5 h-auto shrink-0 rounded-2xl border-[3px]"
            style={{ borderColor: '#2D3436', background: 'white', boxShadow: '4px 4px 0 #2D3436' }}
          >
            <TabsTrigger
              value="play"
              className="font-pixel text-[7px] md:text-[9px] rounded-xl py-2 px-4
                data-[state=active]:bg-[#6C5CE7] data-[state=active]:text-white data-[state=active]:shadow-none
                text-[#636E72]"
            >
              ▶ PLAY
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="font-pixel text-[7px] md:text-[9px] rounded-xl py-2 px-4
                data-[state=active]:bg-[#6C5CE7] data-[state=active]:text-white data-[state=active]:shadow-none
                text-[#636E72]"
            >
              ? RULES
            </TabsTrigger>
            <TabsTrigger
              value="train"
              className="font-pixel text-[7px] md:text-[9px] rounded-xl py-2 px-4
                data-[state=active]:bg-[#6C5CE7] data-[state=active]:text-white data-[state=active]:shadow-none
                text-[#636E72]"
            >
              ★ TRAIN
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="play"
            className="min-h-0 flex items-center justify-center overflow-hidden mt-0"
            style={{ flex: '1 1 0' }}
          >
            <GameBoard />
          </TabsContent>

          <TabsContent
            value="rules"
            className="min-h-0 flex flex-col mt-0"
            style={{ flex: '1 1 0' }}
          >
            <div className="flex-1 min-h-0 overflow-y-auto">
              <GameRules />
            </div>
          </TabsContent>

          <TabsContent
            value="train"
            className="min-h-0 flex flex-col mt-0"
            style={{ flex: '1 1 0' }}
          >
            <div className="flex-1 min-h-0 overflow-y-auto flex justify-center items-start py-1">
              <TrainerBoard />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
