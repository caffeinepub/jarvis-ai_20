import type { FC } from "react";

interface ArcReactorProps {
  status: "online" | "listening" | "processing" | "speaking" | "standby";
}

const ArcReactor: FC<ArcReactorProps> = ({ status }) => {
  const isActive =
    status === "listening" || status === "processing" || status === "speaking";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 340, height: 340 }}
    >
      {/* Outer ambient glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 340,
          height: 340,
          background: isActive
            ? "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(0,212,255,0.03) 0%, transparent 70%)",
          transition: "background 0.5s",
        }}
      />

      {/* Ring 6 — outermost, slowest */}
      <div
        className="absolute rounded-full ring-spin-6"
        style={{
          width: 320,
          height: 320,
          border: "1px solid rgba(0,180,255,0.18)",
          boxShadow: "0 0 6px rgba(0,180,255,0.1)",
        }}
      />

      {/* Ring 5 */}
      <div
        className="absolute rounded-full ring-spin-5"
        style={{
          width: 280,
          height: 280,
          border: "1.5px solid rgba(0,200,255,0.25)",
          borderStyle: "dashed",
          boxShadow: "0 0 8px rgba(0,200,255,0.15)",
        }}
      />

      {/* Ring 4 */}
      <div
        className="absolute rounded-full ring-spin-4"
        style={{
          width: 240,
          height: 240,
          border: "1.5px solid rgba(0,212,255,0.35)",
          boxShadow: "0 0 10px rgba(0,212,255,0.2)",
        }}
      >
        {/* Ring 4 tick marks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={deg}
            className="absolute"
            style={{
              width: 8,
              height: 2,
              background: "rgba(0,212,255,0.6)",
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateX(108px) translateY(-50%)`,
              transformOrigin: "left center",
            }}
          />
        ))}
      </div>

      {/* Ring 3 */}
      <div
        className="absolute rounded-full ring-spin-3"
        style={{
          width: 195,
          height: 195,
          border: "2px solid rgba(0,220,255,0.45)",
          boxShadow: "0 0 14px rgba(0,220,255,0.3)",
        }}
      />

      {/* Ring 2 */}
      <div
        className="absolute rounded-full ring-spin-2"
        style={{
          width: 155,
          height: 155,
          border: "2px solid rgba(0,230,255,0.55)",
          borderStyle: "dashed",
          boxShadow:
            "0 0 16px rgba(0,230,255,0.35), inset 0 0 16px rgba(0,230,255,0.1)",
        }}
      >
        {/* Ring 2 tick marks */}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <div
            key={deg}
            className="absolute"
            style={{
              width: 10,
              height: 1.5,
              background: "rgba(0,230,255,0.8)",
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateX(65px) translateY(-50%)`,
              transformOrigin: "left center",
            }}
          />
        ))}
      </div>

      {/* Ring 1 — innermost rotating */}
      <div
        className="absolute rounded-full ring-spin-1"
        style={{
          width: 110,
          height: 110,
          border: "2.5px solid rgba(0,240,255,0.7)",
          boxShadow:
            "0 0 20px rgba(0,240,255,0.5), inset 0 0 20px rgba(0,240,255,0.2)",
        }}
      />

      {/* HUD radial lines */}
      {[30, 75, 120, 165, 210, 255, 300, 345].map((deg) => (
        <div
          key={deg}
          className="absolute"
          style={{
            position: "absolute",
            width: 1,
            height: 40,
            background:
              "linear-gradient(to bottom, transparent, rgba(0,212,255,0.25))",
            top: "50%",
            left: "50%",
            transform: `rotate(${deg}deg) translateY(-160px)`,
            transformOrigin: "bottom center",
          }}
        />
      ))}

      {/* Core */}
      <div
        className="absolute rounded-full core-pulse"
        style={{
          width: 68,
          height: 68,
          background:
            "radial-gradient(circle, #ffffff 0%, #00ffff 30%, #00d4ff 60%, transparent 100%)",
        }}
      />

      {/* Core inner glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 40,
          height: 40,
          background:
            "radial-gradient(circle, #ffffff 0%, #00ffff 50%, transparent 100%)",
          boxShadow: "0 0 20px 6px rgba(0,255,255,0.9)",
        }}
      />

      {/* Listening pulse rings */}
      {isActive && (
        <>
          <div
            className="absolute rounded-full"
            style={{
              width: 340,
              height: 340,
              border: "1px solid rgba(0,212,255,0.3)",
              animation: "pulse-ring 2s ease-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 340,
              height: 340,
              border: "1px solid rgba(0,212,255,0.15)",
              animation: "pulse-ring 2s ease-out infinite 0.6s",
            }}
          />
        </>
      )}
    </div>
  );
};

export default ArcReactor;
