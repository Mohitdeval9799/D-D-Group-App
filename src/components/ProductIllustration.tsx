import { useId } from 'react';
import type { Product } from '../types';

interface ProductIllustrationProps {
  product: Product;
  className?: string;
}

export function ProductIllustration({ product, className = 'w-full h-full' }: ProductIllustrationProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const plasticId = `pl-${uid}`;
  const metalId = `mt-${uid}`;
  const domeId = `dm-${uid}`;
  const copperId = `cp-${uid}`;

  const s = product.spec.toLowerCase();
  const k = product.kind;

  const surfaceColor = s.includes('black')
    ? '#2b3438'
    : s.includes('brown')
      ? '#6e4e3e'
      : s.includes('champagne')
        ? '#c7b08e'
        : '#f4f6f5';

  const surfaceStroke = s.includes('black')
    ? '#485459'
    : s.includes('brown')
      ? '#553a2d'
      : s.includes('champagne')
        ? '#a78f6d'
        : '#c2cdc8';

  const wireColor = s.includes('red')
    ? '#c43b35'
    : s.includes('blue')
      ? '#2768b0'
      : s.includes('green')
        ? '#2a8560'
        : '#2b3539';

  const warmGlow = s.includes('warm') ? '#ffefc2' : '#eefaff';

  const renderShape = () => {
    if (k === 'switch' || k === 'socket' || k === 'plate') {
      const moduleCount = parseInt(s, 10) || 2;
      const gangCount = s.includes('4 gang') ? 4 : s.includes('2 gang') ? 2 : 1;
      const isDark = s.includes('black');
      const socketHoleFill = isDark ? '#141a1d' : '#2d3b3e';

      return (
        <g>
          {/* Outer frame bezel */}
          <rect x="68" y="24" width="164" height="140" rx="13" fill={`url(#${plasticId})`} stroke="#becac4" strokeWidth="1.2" />
          {/* Inner architectural plate */}
          <rect x="78" y="34" width="144" height="120" rx="8" fill={surfaceColor} stroke={surfaceStroke} strokeWidth="1.2" />
          {/* Subtle top chamfer highlight */}
          <line x1="88" y1="36" x2="212" y2="36" stroke="#ffffff" strokeOpacity={isDark ? 0.14 : 0.75} strokeWidth="1.5" />

          {k === 'plate' && (
            <g>
              {Array.from({ length: Math.min(moduleCount, 8) }).map((_, i) => (
                <rect
                  key={i}
                  x={92 + (i % 4) * 30}
                  y={52 + Math.floor(i / 4) * 45}
                  width="24"
                  height="38"
                  rx="2.5"
                  fill={isDark ? '#21292c' : '#e7eeeb'}
                  stroke={surfaceStroke}
                  strokeWidth="1"
                />
              ))}
              {moduleCount > 8 && (
                <text
                  x="150"
                  y="148"
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  fill={isDark ? '#9fb0aa' : '#617570'}
                >
                  {moduleCount}M SERIES
                </text>
              )}
            </g>
          )}

          {k === 'socket' && (
            <g>
              {s.includes('usb') ? (
                <g>
                  <rect x="114" y="76" width="72" height="34" rx="5" fill="#323d42" stroke="#536268" />
                  {s.includes('usb-c') ? (
                    <rect x="132" y="88" width="36" height="10" rx="5" fill="#11171a" stroke="#7d9096" />
                  ) : (
                    <>
                      <rect x="125" y="86" width="50" height="14" rx="2" fill="#11171a" />
                      <rect x="129" y="89" width="42" height="4" rx="1" fill="#087c67" />
                    </>
                  )}
                </g>
              ) : s.includes('rj') || s.includes('data') ? (
                <g>
                  <rect x="122" y="72" width="56" height="44" rx="4" fill="#323d42" stroke="#536268" />
                  <rect x="132" y="82" width="36" height="24" rx="2" fill="#182124" />
                  <rect x="142" y="76" width="16" height="8" rx="1" fill="#182124" />
                  {[0, 1, 2, 3].map((pin) => (
                    <line key={pin} x1={138 + pin * 8} y1="100" x2={138 + pin * 8} y2="106" stroke="#d9a648" strokeWidth="2" />
                  ))}
                </g>
              ) : s.includes('tv') ? (
                <g>
                  <circle cx="150" cy="94" r="20" fill={`url(#${metalId})`} stroke="#8d9e97" strokeWidth="1.2" />
                  <circle cx="150" cy="94" r="11" fill="#3a4548" />
                  <circle cx="150" cy="94" r="4" fill={`url(#${copperId})`} />
                </g>
              ) : (
                <g>
                  <circle cx="150" cy="68" r="8.5" fill={socketHoleFill} stroke="#8da099" strokeWidth="1" />
                  <circle cx="123" cy="112" r="7.5" fill={socketHoleFill} stroke="#8da099" strokeWidth="1" />
                  <circle cx="177" cy="112" r="7.5" fill={socketHoleFill} stroke="#8da099" strokeWidth="1" />
                  {s.includes('combined') && (
                    <>
                      <circle cx="136" cy="112" r="5" fill={socketHoleFill} />
                      <circle cx="164" cy="112" r="5" fill={socketHoleFill} />
                    </>
                  )}
                </g>
              )}
            </g>
          )}

          {k === 'switch' && (
            <g>
              {s.includes('regulator') || s.includes('dimmer') ? (
                <g>
                  <circle cx="150" cy="94" r="34" fill={`url(#${plasticId})`} stroke="#9eb0a8" strokeWidth="1.5" />
                  <circle cx="150" cy="94" r="24" fill={surfaceColor} stroke={surfaceStroke} strokeWidth="1.2" />
                  <line x1="150" y1="65" x2="150" y2="79" stroke="#087c67" strokeWidth="3.2" strokeLinecap="round" />
                  {[-60, -30, 0, 30, 60].map((deg) => (
                    <circle
                      key={deg}
                      cx={150 + 41 * Math.sin((deg * Math.PI) / 180)}
                      cy={94 - 41 * Math.cos((deg * Math.PI) / 180)}
                      r="1.8"
                      fill="#748a82"
                    />
                  ))}
                </g>
              ) : s.includes('key-card') ? (
                <g>
                  <rect x="108" y="54" width="84" height="80" rx="5" fill={surfaceColor} stroke="#98aaa2" />
                  <rect x="118" y="62" width="64" height="7" rx="3" fill="#233432" />
                  <rect x="132" y="84" width="36" height="32" rx="3" fill="#e6f0ec" stroke="#087c67" strokeDasharray="3 2" />
                </g>
              ) : (
                <g>
                  {Array.from({ length: gangCount }).map((_, i) => {
                    const width = 104 / gangCount - 4;
                    const x = 98 + i * (104 / gangCount) + 2;
                    return (
                      <g key={i}>
                        <rect
                          x={x}
                          y="54"
                          width={width}
                          height="80"
                          rx="4"
                          fill={surfaceColor}
                          stroke={s.includes('touch') || s.includes('wi-fi') ? '#087c67' : '#96a8a0'}
                          strokeWidth="1.2"
                        />
                        {s.includes('touch') || s.includes('wi-fi') ? (
                          <circle
                            cx={x + width / 2}
                            cy="94"
                            r="6.5"
                            fill="none"
                            stroke="#087c67"
                            strokeWidth="2"
                          />
                        ) : (
                          <rect
                            x={x + width / 2 - Math.min(11, width * 0.25)}
                            y="64"
                            width={Math.min(22, width * 0.5)}
                            height="3.5"
                            rx="1.5"
                            fill={s.includes('dp') ? '#e37736' : '#087c67'}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          )}
        </g>
      );
    }

    if (k === 'bulb') {
      const watt = parseInt(s, 10) || 9;
      const r = Math.min(48, 34 + watt * 0.55);
      return (
        <g>
          {/* Ambient glow halo */}
          <circle cx="150" cy="64" r={r + 16} fill={warmGlow} opacity="0.45" />
          {/* Polycarbonate diffuser dome */}
          <path
            d={`M${150 - r} 82 Q${150 - r - 9} 18 150 18 Q${150 + r + 9} 18 ${150 + r} 82 Z`}
            fill={`url(#${domeId})`}
            stroke="#cdd9d4"
            strokeWidth="1.1"
          />
          {/* Thermal heat sink housing */}
          <path
            d={`M${150 - r} 82 Q${150 - r + 5} 107 132 122 H168 Q${150 + r - 5} 107 ${150 + r} 82 Z`}
            fill={`url(#${plasticId})`}
            stroke="#c1cfc8"
            strokeWidth="1.1"
          />
          {/* Brand collar band */}
          <line x1={150 - r + 4} y1="86" x2={150 + r - 4} y2="86" stroke="#087c67" strokeWidth="2.5" strokeOpacity="0.6" />
          {/* B22 aluminum cap */}
          <rect x="133" y="122" width="34" height="30" rx="4" fill={`url(#${metalId})`} stroke="#8d9f98" />
          {[128, 134, 140, 146].map((y) => (
            <line key={y} x1="134" y1={y} x2="166" y2={y} stroke="#7e918a" strokeWidth="1" />
          ))}
          {/* Bayonet pins & solder contacts */}
          <circle cx="131" cy="137" r="3" fill="#82948e" />
          <circle cx="169" cy="137" r="3" fill="#82948e" />
          <rect x="139" y="152" width="7" height="5" rx="1.5" fill="#70827b" />
          <rect x="154" y="152" width="7" height="5" rx="1.5" fill="#70827b" />
        </g>
      );
    }

    if (k === 'panel') {
      if (s.includes('round')) {
        return (
          <g>
            <ellipse cx="150" cy="104" rx="92" ry="56" fill={`url(#${metalId})`} stroke="#9eb0a8" />
            <ellipse cx="150" cy="96" rx="92" ry="56" fill="#fbfcfb" stroke="#cad6d0" strokeWidth="1.2" />
            <ellipse cx="150" cy="96" rx="76" ry="43" fill={warmGlow} stroke="#d4e0da" />
            <ellipse cx="150" cy="92" rx="54" ry="26" fill="#ffffff" opacity="0.45" />
          </g>
        );
      }
      return (
        <g>
          <rect x="58" y="42" width="184" height="114" rx="6" fill={`url(#${metalId})`} stroke="#9db0a7" />
          <rect x="63" y="37" width="174" height="110" rx="5" fill="#fafcfb" stroke="#cad6d0" strokeWidth="1.2" />
          <rect x="75" y="48" width="150" height="88" rx="3" fill={warmGlow} stroke="#d4e0da" />
          <rect x="85" y="56" width="130" height="32" rx="2" fill="#ffffff" opacity="0.35" />
        </g>
      );
    }

    if (k === 'tube') {
      return (
        <g transform="rotate(-16 150 95)">
          <rect x="24" y="80" width="252" height="30" rx="7" fill="#c9d6cf" stroke="#a6b8af" />
          <rect x="30" y="75" width="240" height="24" rx="6" fill={`url(#${domeId})`} stroke="#d3dfda" />
          <rect x="22" y="78" width="13" height="32" rx="3" fill="#1c433c" />
          <rect x="265" y="78" width="13" height="32" rx="3" fill="#1c433c" />
          <line x1="42" y1="83" x2="258" y2="83" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.65" />
        </g>
      );
    }

    if (k === 'flood') {
      return (
        <g>
          {/* Heavy die-cast mounting bracket */}
          <path d="M98 136v26h104v-26" fill="none" stroke="#2f4044" strokeWidth="9" strokeLinejoin="round" />
          {/* Finned aluminum chassis */}
          <rect x="66" y="30" width="168" height="116" rx="10" fill="#243336" stroke="#44575c" strokeWidth="1.5" />
          <rect x="77" y="40" width="146" height="96" rx="6" fill={`url(#${metalId})`} />
          <rect x="88" y="49" width="124" height="78" rx="4" fill="#edf1e3" stroke="#c3ccc0" />
          {[63, 79, 95, 111].map((y) =>
            [100, 118, 136, 154, 172, 190].map((x) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" rx="1.5" fill="#ffe985" stroke="#d4bc62" strokeWidth="0.8" />
            ))
          )}
        </g>
      );
    }

    if (k === 'strip') {
      return (
        <g>
          <circle cx="138" cy="92" r="62" fill="#2b3c40" stroke="#4b5f63" strokeWidth="1.5" />
          <circle cx="138" cy="92" r="48" fill="#d9e4de" />
          <circle cx="138" cy="92" r="34" fill="#324347" />
          <circle cx="138" cy="92" r="13" fill="#d5e1da" />
          <path d="M192 122 Q248 140 264 88" fill="none" stroke="#dcd19c" strokeWidth="9" strokeLinecap="round" />
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = (i * Math.PI) / 9;
            const chipFill = s.includes('rgb')
              ? ['#57c7e8', '#ef6f91', '#67d47c'][i % 3]
              : warmGlow;
            return (
              <circle
                key={i}
                cx={138 + 55 * Math.cos(angle)}
                cy={92 + 55 * Math.sin(angle)}
                r="3.6"
                fill={chipFill}
              />
            );
          })}
        </g>
      );
    }

    if (k === 'wire') {
      return (
        <g>
          {Array.from({ length: 10 }).map((_, i) => (
            <g key={i}>
              <ellipse
                cx="148"
                cy={120 - i * 3.2}
                rx="78"
                ry="41"
                fill="none"
                stroke={wireColor}
                strokeWidth="8.5"
              />
              <ellipse
                cx="148"
                cy={118 - i * 3.2}
                rx="77"
                ry="40"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.18"
                strokeWidth="1.2"
              />
            </g>
          ))}
          {/* Stripped copper conductor tail */}
          <path d="M222 108 Q254 96 242 46" fill="none" stroke={wireColor} strokeWidth="9" strokeLinecap="round" />
          <path d="M242 46 L242 23" stroke={`url(#${copperId})`} strokeWidth="5.5" strokeLinecap="round" />
          <line x1="240" y1="26" x2="240" y2="42" stroke="#f5c694" strokeWidth="1.2" />
        </g>
      );
    }

    if (k === 'cable') {
      const cores = ['#c94c40', '#296ab3', '#d9b943', '#2e8762'];
      const coreCount = s.includes('2 core') ? 2 : s.includes('3 core') ? 3 : 4;
      return (
        <g>
          <path d="M52 146 L172 64" stroke="#222d30" strokeWidth="44" strokeLinecap="round" />
          <path d="M52 134 L172 52" stroke="#5c6c6a" strokeWidth="3.5" opacity="0.55" strokeLinecap="round" />
          {cores.slice(0, coreCount).map((col, i) => {
            const x = 165 + i * 13;
            const y = 70 - i * 4.5;
            return (
              <g key={col}>
                <path
                  d={`M${x} ${y} Q${206 + i * 5} ${56 + i * 8} ${214 + i * 7} ${24 + i * 5}`}
                  fill="none"
                  stroke={col}
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <path
                  d={`M${214 + i * 7} ${24 + i * 5} l6 -14`}
                  stroke={`url(#${copperId})`}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </g>
      );
    }

    if (k === 'breaker') {
      const poles =
        s.includes('tpn') || s.includes('4 pole') || s.includes('3p+n')
          ? 4
          : s.includes('tp') || s.includes('3 pole')
            ? 3
            : s.includes('dp') || s.includes('2 pole') || s.includes('1p+n')
              ? 2
              : 1;
      const w = 38 * poles;
      const startX = 150 - w / 2;

      return (
        <g>
          {/* DIN rail backing bar */}
          <rect x="44" y="84" width="212" height="22" rx="2" fill={`url(#${metalId})`} opacity="0.45" />
          {Array.from({ length: poles }).map((_, i) => {
            const x = startX + 38 * i;
            return (
              <g key={i}>
                <rect x={x} y="25" width="37" height="138" rx="3.5" fill={`url(#${plasticId})`} stroke="#b7c6be" />
                {/* Top terminal clamp */}
                <rect x={x + 6} y="16" width="25" height="18" rx="2" fill="#bac8c0" stroke="#99aba1" />
                <circle cx={x + 18.5} cy="25" r="5" fill="#6f8278" />
                <line x1={x + 15} y1="25" x2={x + 22} y2="25" stroke="#dce5e0" strokeWidth="1.4" />
                {/* Toggle housing */}
                <rect x={x + 6} y="54" width="25" height="50" rx="2.5" fill="#b7c7bd" />
                <rect x={x + 8} y="66" width="21" height="25" rx="2.5" fill="#0d3b33" />
                {/* ON/OFF status window */}
                <rect x={x + 11} y="108" width="15" height="5" rx="1" fill="#087c67" />
                {/* Bottom terminal */}
                <rect x={x + 6} y="135" width="25" height="19" rx="2" fill="#bac8c0" stroke="#99aba1" />
                <circle cx={x + 18.5} cy="144" r="4.5" fill="#6f8278" />
              </g>
            );
          })}
          {/* Tied handle bar for multi-pole breakers */}
          {poles > 1 && (
            <rect x={startX + 8} y="73" width={w - 16} height="10" rx="2.5" fill="#087c67" />
          )}
        </g>
      );
    }

    if (k === 'db') {
      const ways = Math.min(8, parseInt(s, 10) || 4);
      const isDoubleDoor = s.includes('double');
      return (
        <g>
          <rect x="46" y="20" width="208" height="150" rx="8" fill={`url(#${metalId})`} stroke="#8fa49a" strokeWidth="1.2" />
          <rect x="56" y="29" width="188" height="132" rx="5" fill="#f9fbfa" stroke="#c3d0c9" />
          {isDoubleDoor && (
            <rect x="64" y="36" width="172" height="118" rx="3" fill="none" stroke="#dce6e1" strokeWidth="1.5" />
          )}
          <rect x="74" y="61" width="152" height="72" rx="3" fill="#3a4f49" />
          {Array.from({ length: ways }).map((_, i) => {
            const slotW = 138 / ways;
            return (
              <g key={i}>
                <rect
                  x={81 + i * slotW}
                  y="70"
                  width={slotW - 2.5}
                  height="52"
                  rx="2"
                  fill="#eef3f0"
                />
                <rect
                  x={83 + i * slotW}
                  y="88"
                  width={Math.max(4, slotW - 6.5)}
                  height="14"
                  rx="1.5"
                  fill="#087c67"
                />
              </g>
            );
          })}
          {/* Brand strip & busbar indicator */}
          <rect x="74" y="41" width="72" height="7" rx="1.5" fill="#087c67" opacity="0.22" />
          <rect x="74" y="143" width="152" height="4" rx="1.5" fill="#c4d3cb" />
        </g>
      );
    }

    if (k === 'fan') {
      return (
        <g>
          {/* Downrod & canopy */}
          <rect x="146" y="22" width="8" height="42" rx="2" fill={`url(#${metalId})`} />
          <ellipse cx="150" cy="24" rx="18" ry="6" fill={`url(#${metalId})`} />
          {/* 3 aerodynamic blades */}
          {[0, 120, 240].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle} 150 100)`}
              d="M145 94 Q86 52 32 76 Q28 92 64 99 L143 111 Z"
              fill={surfaceColor}
              stroke={surfaceStroke}
              strokeWidth="1.2"
            />
          ))}
          {/* Motor housing with metallic trim */}
          <ellipse cx="150" cy="102" rx="30" ry="22" fill={`url(#${metalId})`} />
          <ellipse cx="150" cy="96" rx="29" ry="18" fill={surfaceColor} stroke={surfaceStroke} strokeWidth="1.2" />
          <ellipse cx="150" cy="96" rx="12" ry="7" fill="none" stroke="#087c67" strokeOpacity="0.45" strokeWidth="1.5" />
        </g>
      );
    }

    if (k === 'exhaust') {
      return (
        <g>
          <rect x="73" y="18" width="154" height="154" rx="9" fill={`url(#${plasticId})`} stroke="#b7c6be" />
          <circle cx="150" cy="95" r="62" fill="#d3dfd8" stroke="#aebfb5" strokeWidth="1.2" />
          {[0, 90, 180, 270].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle} 150 95)`}
              d="M150 95 Q106 74 127 45 Q155 34 159 86 Z"
              fill="#f8fbf9"
              stroke="#9eb2a6"
              strokeWidth="1.2"
            />
          ))}
          <circle cx="150" cy="95" r="18" fill={`url(#${metalId})`} stroke="#8fa49a" />
          {[84, 216].map((x) =>
            [29, 161].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#899e93" />)
          )}
        </g>
      );
    }

    if (k === 'tablefan') {
      return (
        <g>
          <rect x="136" y="114" width="28" height="48" rx="5" fill={`url(#${metalId})`} />
          <ellipse cx="150" cy="166" rx="52" ry="9.5" fill="#b4c8bd" stroke="#8ea498" />
          <circle cx="150" cy="76" r="59" fill="#e6efe9" stroke="#85a293" strokeWidth="1.5" />
          {[0, 120, 240].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle} 150 76)`}
              d="M150 76 Q110 49 130 24 Q158 19 158 68 Z"
              fill="#087c67"
              fillOpacity="0.45"
            />
          ))}
          {[18, 30, 42, 54].map((r) => (
            <circle key={r} cx="150" cy="76" r={r} fill="none" stroke="#6f8b7c" strokeWidth="1" />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              transform={`rotate(${i * 30} 150 76)`}
              x1="150"
              y1="18"
              x2="150"
              y2="134"
              stroke="#86a090"
              strokeWidth="0.9"
            />
          ))}
          <circle cx="150" cy="76" r="12" fill="#dce8e0" stroke="#758f81" />
        </g>
      );
    }

    if (k === 'pcb') {
      const blank = s.includes('blank');
      const bread = s.includes('breadboard');
      const boardFill = blank ? '#c48d59' : bread ? '#f3f3ea' : '#1b6e4d';
      return (
        <g>
          <rect x="54" y="32" width="192" height="126" rx="5" fill={boardFill} stroke="#2a4c3e" strokeWidth="1.4" />
          {blank ? (
            <rect x="62" y="40" width="176" height="110" rx="2" fill={`url(#${copperId})`} opacity="0.88" />
          ) : bread || s.includes('dot') || s.includes('stripboard') ? (
            <g>
              {Array.from({ length: 16 }).map((_, xi) =>
                Array.from({ length: 10 }).map((__, yi) => (
                  <circle
                    key={`${xi}-${yi}`}
                    cx={68 + xi * 11}
                    cy={45 + yi * 11}
                    r="1.7"
                    fill={bread ? '#8d968a' : '#d6b460'}
                  />
                ))
              )}
            </g>
          ) : (
            <g>
              {Array.from({ length: 7 }).map((_, i) => (
                <path
                  key={i}
                  d={`M${68 + i * 22} 44 v${24 + i * 5} h${18 + i * 3} v46`}
                  fill="none"
                  stroke="#6ec091"
                  strokeWidth="2"
                />
              ))}
              <rect x="118" y="68" width="64" height="44" rx="3" fill="#24302c" />
              <rect x="72" y="54" width="32" height="38" rx="3" fill="#237ba3" />
              <circle cx="206" cy="116" r="13" fill="#aebfb3" stroke="#223b30" strokeWidth="1.5" />
              {[124, 134, 144, 154, 164, 174].map((x) => (
                <g key={x}>
                  <rect x={x} y="60" width="3.5" height="8" fill="#d7d2a7" />
                  <rect x={x} y="112" width="3.5" height="8" fill="#d7d2a7" />
                </g>
              ))}
            </g>
          )}
        </g>
      );
    }

    if (k === 'conduit') {
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path
                d={`M${60 + i * 9} ${140 - i * 22} L${238 + i * 3} ${76 - i * 22}`}
                stroke="#94a89d"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d={`M${60 + i * 9} ${137 - i * 22} L${238 + i * 3} ${73 - i * 22}`}
                stroke="#e7efea"
                strokeWidth="11.5"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>
      );
    }

    if (k === 'box') {
      return (
        <g>
          <rect x="66" y="40" width="168" height="112" rx="5" fill={`url(#${metalId})`} stroke="#7f9489" strokeWidth="1.4" />
          <rect x="78" y="51" width="144" height="88" rx="2" fill="#82968b" />
          <rect x="85" y="58" width="130" height="74" rx="1.5" fill="#c7d5cb" />
          <circle cx="150" cy="95" r="21" fill="#9fb2a6" stroke="#6f8578" strokeWidth="1.5" />
          <circle cx="105" cy="95" r="9" fill="#9fb2a6" stroke="#6f8578" />
          <circle cx="195" cy="95" r="9" fill="#9fb2a6" stroke="#6f8578" />
        </g>
      );
    }

    if (k === 'tool') {
      if (s.includes('meter')) {
        return (
          <g>
            {s.includes('clamp') && (
              <path d="M128 32 Q103 -5 150 -6 Q195 -5 172 32" fill="none" stroke="#d4ab39" strokeWidth="13" />
            )}
            <rect x="108" y="26" width="84" height="138" rx="13" fill="#e2ba46" stroke="#b38f2c" strokeWidth="1.5" />
            <rect x="116" y="34" width="68" height="116" rx="8" fill="#2c3a36" />
            <rect x="124" y="45" width="52" height="31" rx="3" fill="#b4cbb1" />
            <text x="168" y="66" textAnchor="end" fontSize="13" fontFamily="JetBrains Mono, monospace" fill="#1e3128" fontWeight="700">
              230.4
            </text>
            <circle cx="150" cy="112" r="22" fill="#1f312b" stroke="#6f887b" strokeWidth="1.5" />
            <line x1="150" y1="112" x2="162" y2="98" stroke="#c9d9c8" strokeWidth="4" strokeLinecap="round" />
          </g>
        );
      }
      return (
        <g>
          <path d="M106 146 L146 78 L178 48" stroke="#576a60" strokeWidth="12" strokeLinecap="round" />
          <path d="M190 146 L152 78 L122 48" stroke="#85988c" strokeWidth="12" strokeLinecap="round" />
          <path d="M106 146 l25 -46 M190 146 l-24 -45" stroke="#087c67" strokeWidth="18" strokeLinecap="round" />
          <circle cx="149" cy="80" r="8.5" fill={`url(#${metalId})`} stroke="#586d61" />
        </g>
      );
    }

    // Accessories fallback shapes
    if (s.includes('tape') || s.includes('reel')) {
      return (
        <g>
          <ellipse cx="150" cy="102" rx="66" ry="47" fill="#21332c" />
          <ellipse cx="150" cy="89" rx="66" ry="47" fill="#354f44" />
          <ellipse cx="150" cy="89" rx="35" ry="24" fill="#d1c3a5" />
          <ellipse cx="150" cy="93" rx="24" ry="14" fill="#edf2ee" />
        </g>
      );
    }
    if (s.includes('extension')) {
      return (
        <g>
          <rect x="42" y="62" width="216" height="70" rx="10" fill={`url(#${plasticId})`} stroke="#b4c4bc" />
          {[78, 126, 174, 222].map((x) => (
            <g key={x}>
              <circle cx={x} cy="83" r="4.5" fill="#344a40" />
              <circle cx={x - 9} cy="109" r="3.5" fill="#344a40" />
              <circle cx={x + 9} cy="109" r="3.5" fill="#344a40" />
            </g>
          ))}
        </g>
      );
    }
    if (s.includes('lug') || s.includes('rod') || s.includes('clamp')) {
      return (
        <g>
          <path d="M74 146 L222 42" stroke={`url(#${copperId})`} strokeWidth="18" strokeLinecap="round" />
          <path d="M74 143 L222 39" stroke="#f2c48d" strokeWidth="4.5" strokeLinecap="round" opacity="0.65" />
          <circle cx="222" cy="40" r="16" fill={`url(#${copperId})`} />
          <circle cx="222" cy="40" r="7.5" fill="#f1f5f3" />
        </g>
      );
    }
    if (s.includes('ties') || s.includes('shrink')) {
      return (
        <g>
          {['#2d4539', '#b8493c', '#3c688c', '#087c67', '#c9a143'].map((col, i) => (
            <path
              key={col}
              d={`M${80 + i * 19} 148 L${120 + i * 19} 38`}
              stroke={col}
              strokeWidth="8.5"
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    }
    return (
      <g>
        <rect x="64" y="64" width="172" height="66" rx="6" fill={`url(#${plasticId})`} stroke="#b4c4bc" />
        {[82, 109, 136, 163, 190, 217].map((x) => (
          <g key={x}>
            <circle cx={x} cy="82" r="5" fill="#445c51" />
            <circle cx={x} cy="112" r="5" fill="#445c51" />
          </g>
        ))}
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 300 190"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Representative illustration: ${product.name}`}
      className={className}
    >
      <defs>
        <linearGradient id={plasticId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e6ede9" />
          <stop offset="100%" stopColor="#bccac2" />
        </linearGradient>
        <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#869a90" />
          <stop offset="45%" stopColor="#eaf1ed" />
          <stop offset="100%" stopColor="#94a79d" />
        </linearGradient>
        <linearGradient id={copperId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e5ae73" />
          <stop offset="55%" stopColor="#bf7d44" />
          <stop offset="100%" stopColor="#8d5628" />
        </linearGradient>
        <radialGradient id={domeId} cx="35%" cy="22%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor={warmGlow} />
          <stop offset="100%" stopColor="#d3e0da" />
        </radialGradient>
      </defs>
      {/* Grounded contact shadow */}
      <ellipse cx="150" cy="175" rx="84" ry="7" fill="#18382f" opacity="0.09" />
      {renderShape()}
    </svg>
  );
}
