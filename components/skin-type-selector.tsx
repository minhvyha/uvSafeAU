'use client'

import { Card } from '@/components/ui/card'

interface SkinTypeProps {
  selectedType: number
  onTypeChange: (type: number) => void
}

const skinTypes = [
  {
    type: 1,
    name: 'Type I',
    description: 'Pale white skin, blue/green eyes, red/blonde hair',
    burnTime: 'Burns easily, never tans',
    constant: 200,
    emoji: '🧑‍🦰',
  },
  {
    type: 2,
    name: 'Type II',
    description: 'Fair skin, blue eyes',
    burnTime: 'Burns easily, tans minimally',
    constant: 250,
    emoji: '👱',
  },
  {
    type: 3,
    name: 'Type III',
    description: 'Fair to beige skin',
    burnTime: 'Burns moderately, tans gradually',
    constant: 350,
    emoji: '🧑',
  },
  {
    type: 4,
    name: 'Type IV',
    description: 'Beige to light brown skin',
    burnTime: 'Burns minimally, tans easily',
    constant: 450,
    emoji: '👨‍🦱',
  },
  {
    type: 5,
    name: 'Type V',
    description: 'Brown skin',
    burnTime: 'Rarely burns, tans darkly',
    constant: 600,
    emoji: '🧑🏾',
  },
  {
    type: 6,
    name: 'Type VI',
    description: 'Dark brown to black skin',
    burnTime: 'Never burns, deeply pigmented',
    constant: 1000,
    emoji: '🧑🏿',
  },
]

export function SkinTypeSelector({ selectedType, onTypeChange }: SkinTypeProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">Select Your Skin Type</h3>
        <span className="text-xs text-muted-foreground">Scroll to see more</span>
      </div>
      <div className="relative -mx-4 px-4">
        <div 
          className="flex gap-3 pb-4 overflow-x-auto scrollbar-thin snap-x snap-mandatory"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--accent) var(--muted)',
          }}
        >
          {skinTypes.map((skin) => (
            <Card
              key={skin.type}
              onClick={() => onTypeChange(skin.type)}
              className={`
                flex-shrink-0 w-44 md:w-48 p-4 cursor-pointer transition-all duration-200
                hover:shadow-lg hover:scale-[1.02] snap-start
                ${
                  selectedType === skin.type
                    ? 'border-2 border-accent bg-accent/5 shadow-md'
                    : 'border border-border bg-card hover:border-accent/50'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{skin.emoji}</span>
                <div>
                  <div className={`font-bold text-base ${selectedType === skin.type ? 'text-accent' : 'text-foreground'}`}>
                    {skin.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fitzpatrick Scale
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {skin.description}
              </p>
              <p className="text-xs font-medium text-foreground/80 line-clamp-2">
                {skin.burnTime}
              </p>
              {selectedType === skin.type && (
                <div className="mt-3 pt-3 border-t border-accent/20">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs font-medium text-accent">Selected</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
          {/* Spacer for edge padding */}
          <div className="flex-shrink-0 w-1" />
        </div>
      </div>
    </div>
  )
}

export { skinTypes }
