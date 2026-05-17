'use client';

import { useMemo } from 'react';
import { AgentCore } from '@/components/cockpit/scene/agent-core';
import { SubagentSatellite } from '@/components/cockpit/scene/subagent-satellite';
import { ToolArc } from '@/components/cockpit/scene/tool-arc';
import type { AgentSceneProps } from '@/components/cockpit/scene/agent-scene';

interface Props {
  sceneState: AgentSceneProps;
  position?: [number, number, number];
  scale?: number;
}

export function AgentCoreGroup({
  sceneState,
  position = [0, 1.0, -1.8],
  scale = 0.32,
}: Props) {
  const { status, toolCategory, subagents, toolArcs } = sceneState;

  const aliveSubagentIds = useMemo(
    () => new Set(subagents.map((s) => s.id)),
    [subagents],
  );

  const pulseKey = toolArcs.length;

  return (
    <group position={position} scale={scale}>
      <AgentCore
        status={status}
        toolCategory={toolCategory}
        pulseKey={pulseKey}
      />

      {subagents.map((s, i) => (
        <SubagentSatellite
          key={s.id}
          index={i}
          total={subagents.length}
          bornAt={s.bornAt}
          toolCategory={s.toolCategory}
          alive={aliveSubagentIds.has(s.id)}
        />
      ))}

      {toolArcs.map((arc) => (
        <ToolArc
          key={arc.id}
          id={arc.id}
          toolCategory={arc.toolCategory}
          bornAt={arc.bornAt}
          doneAt={arc.doneAt}
        />
      ))}
    </group>
  );
}
