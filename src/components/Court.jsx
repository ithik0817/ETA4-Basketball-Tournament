// src/components/Court.jsx
import React, { useRef, useState } from "react";
import courtImage from "../images/FIBA_Court.svg";

export default function Court({
  onAddShot,
  selectedPlayerId,
  selectedTeamId,
  onUndo,
  shots,
  quarter,
  activeHomePlayers,
  activeAwayPlayers,
  homeTeamId,
  awayTeamId,
  flipCourt,
  homeTeamName,
  awayTeamName,
}) {
  console.log("activeHomePlayers",activeHomePlayers)
  console.log("activeAwayPlayers",activeAwayPlayers)

  const svgRef = useRef(null);
  const [debug, setDebug] = useState(false);
  const [pendingShot, setPendingShot] = useState(null);
  const [popupStep, setPopupStep] = useState(null);
  const [selectedControl, setSelectedControl] = useState(null);

  const COURT_WIDTH_FT = 91.9;
  const COURT_HEIGHT_FT = 49.2;
  const THREE_RADIUS_FT = 22.14567;
  const RIM_OFFSET_FT = 5.1673228;
  const RIM_Y_FT = COURT_HEIGHT_FT / 2.005;
  const CORNER_THREE_RECT_WIDTH_FT = 10;
  const CORNER_THREE_RECT_HEIGHT_FT = 3.175;

  const COURT_WIDTH_PX = 797.19;
  const COURT_HEIGHT_PX = 427.98;

  const scaleX = COURT_WIDTH_PX / COURT_WIDTH_FT;
  const scaleY = COURT_HEIGHT_PX / COURT_HEIGHT_FT;

  const TopX = 0;
  const TopY = 0;
  const BottomY = COURT_HEIGHT_FT - CORNER_THREE_RECT_HEIGHT_FT;
  const RightX = COURT_WIDTH_FT - CORNER_THREE_RECT_WIDTH_FT;
  const rectWidthPx = ftToPxX(CORNER_THREE_RECT_WIDTH_FT);
  const rectHeightPx = ftToPxY(CORNER_THREE_RECT_HEIGHT_FT);
  const BottomYPx = ftToPxY(BottomY);
  const RightXPx = ftToPxX(RightX);

  const rimLeftPx = {
    x: ftToPxX(RIM_OFFSET_FT),
    y: ftToPxY(RIM_Y_FT)
  };
  const rimRightPx = {
    x: ftToPxX(COURT_WIDTH_FT - RIM_OFFSET_FT),
    y: ftToPxY(RIM_Y_FT),
  };

  function ftToPxX(ftX) { return ftX * scaleX; }
  function ftToPxY(ftY) { return ftY * scaleY; }
  function pxToFtX(pxX) { return pxX / scaleX; }
  function pxToFtY(pxY) { return pxY / scaleY; }

  function toSVGPoint(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return null;

    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return null;

    const inv = ctm.inverse();
    const svgP = pt.matrixTransform(inv);

    return { x: svgP.x, y: svgP.y };
  }

  function handlePointerDown(e) {
    const svgP = toSVGPoint(e.clientX, e.clientY);
    if (!svgP) return;

    const ftX = pxToFtX(svgP.x);
    const ftY = pxToFtY(svgP.y);

    let courtSide;
    if (!flipCourt) {
      courtSide = ftX < COURT_WIDTH_FT / 2 ? "home" : "away";
    } else {
      courtSide = ftX < COURT_WIDTH_FT / 2 ? "away" : "home";
    }

    console.log("flipCourt:", flipCourt);
    console.log("ftX:", ftX);
    console.log("Court Side determined:", courtSide);

    setPendingShot({
      x: e.clientX,
      y: e.clientY,
      ftX,
      ftY,
      courtSide,
      flipCourt,
      isFreeThrow: false
      });

    setPopupStep("player");
  }

  function computeIsThree(ftX, ftY, courtSide, flipCourt) {
    let rimX;
    const rimY = RIM_Y_FT;

    if (!flipCourt) {
        rimX = courtSide === "home" ? RIM_OFFSET_FT : COURT_WIDTH_FT - RIM_OFFSET_FT;
    } else {
        rimX = courtSide === "home" ? COURT_WIDTH_FT - RIM_OFFSET_FT : RIM_OFFSET_FT;
    }

    const dx = ftX - rimX;
    const dy = ftY - rimY;
    const distFt = Math.hypot(dx, dy);

    const inLeftTopCorner =
      ftX >= TopX &&
      ftX <= (TopX + CORNER_THREE_RECT_WIDTH_FT) &&
      ftY >= TopY &&
      ftY <= (TopY + CORNER_THREE_RECT_HEIGHT_FT);
    const inLeftBottomCorner =
      ftX >= TopX &&
      ftX <= (TopX + CORNER_THREE_RECT_WIDTH_FT) &&
      ftY >= BottomY &&
      ftY <= (BottomY + CORNER_THREE_RECT_HEIGHT_FT);
    const inRightTopCorner =
      ftX >= RightX &&
      ftX <= (RightX + CORNER_THREE_RECT_WIDTH_FT) &&
      ftY >= TopY &&
      ftY <= (TopY + CORNER_THREE_RECT_HEIGHT_FT);
    const inRightBottomCorner =
      ftX >= RightX &&
      ftX <= (RightX + CORNER_THREE_RECT_WIDTH_FT) &&
      ftY >= BottomY &&
      ftY <= (BottomY + CORNER_THREE_RECT_HEIGHT_FT);

    const inCorner3 = inLeftTopCorner || inLeftBottomCorner || inRightTopCorner || inRightBottomCorner;
    const behindArc = distFt > THREE_RADIUS_FT;
    const is3 = inCorner3 || behindArc;
    return { is3, distFt, inCorner3, behindArc };
  }

  function finalizeShot(made) {
    const { ftX, ftY, playerId, teamId, courtSide, flipCourt, isFreeThrow } = pendingShot;
   
    let newShot;
    if (isFreeThrow) {
      newShot = {
        id: Date.now().toString(),
        playerId,
        teamId,
        isFreeThrow: true,
        made,
        points: 1,
        distFt: 15,
        quarter,
        flipCourt,
      };
    } else {
      const { is3, distFt, inCorner3, behindArc } = computeIsThree(ftX, ftY, courtSide, flipCourt);
      const points = is3 ? 3 : 2;

      newShot = {
      id: Date.now().toString(),
      playerId,
      teamId,
      isFreeThrow: false,
      ftX,
      ftY,
      is3,
      distFt,
      courtSide,
      flipCourt,
      inCorner3,
      behindArc,
      made,
      points,
      quarter,
    };
  }

    onAddShot(newShot);
    setPendingShot(null);
    setPopupStep(null);
    console.log(newShot)
  }

  const rightColumnPlayers = (flipCourt ? activeHomePlayers : activeAwayPlayers)
    .map(p => ({ ...p, teamId: flipCourt ? homeTeamId : awayTeamId }));

  const leftColumnPlayers = (flipCourt ? activeAwayPlayers : activeHomePlayers)
    .map(p => ({ ...p, teamId: flipCourt ? awayTeamId : homeTeamId }));

  return (
  <div className="court-main">
    {/* Court container */}
    <div className="court-container" onPointerDown={handlePointerDown}>
      <img
        className="court-image"
        src={courtImage}
        alt="Basketball Court"
        draggable={false}
      />
      <svg
        className="court-svg"
        ref={svgRef}
        viewBox={`0 0 ${COURT_WIDTH_PX} ${COURT_HEIGHT_PX}`}
      >
        {/* Debug layer */}
        {debug && (
          <g>
            {/* 3PT arcs */}
            <circle  
              className="3pt-arc"
              cx={rimLeftPx.x}
              cy={rimLeftPx.y}
              r={THREE_RADIUS_FT * scaleX}
              fill="none"
              stroke="red"
              strokeDasharray="6,4"
            />
            <circle
              cx={rimRightPx.x}
              cy={rimRightPx.y}
              r={THREE_RADIUS_FT * scaleX}
              fill="none"
              stroke="red"
              strokeDasharray="6,4"
            />

            {/* Rims */}
            <circle
              cx={rimLeftPx.x}
              cy={rimLeftPx.y}
              r={7.5}
              fill="white"
              stroke="red"
            />
            <circle
              cx={rimRightPx.x}
              cy={rimRightPx.y}
              r={7.5}
              fill="white"
              stroke="red"
            />

            {/* Corner 3 rectangles */}
            <rect
              x={ftToPxX(TopX)}
              y={ftToPxY(TopY)}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
            />
            <rect
              x={ftToPxX(TopX)}
              y={BottomYPx}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
            />
            <rect
              x={RightXPx}
              y={ftToPxY(TopY)}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
            />
            <rect
              x={RightXPx}
              y={BottomYPx}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
            />
          </g>
        )}

        {/* Shots render marker*/}
        {shots.map((shot) => {
            const isAway = shot.courtSide === "away";
            const shotFlipCourt = shot.flipCourt !== undefined ? shot.flipCourt : false;
            const targetRimX = shotFlipCourt ? (isAway ? rimLeftPx.x : rimRightPx.x) : (isAway ? rimRightPx.x : rimLeftPx.x);
            const targetRimY = shotFlipCourt ? (isAway ? rimLeftPx.y : rimRightPx.y) : (isAway ? rimRightPx.y : rimLeftPx.y);
            return (
              <g key={shot.id}>
                {!shot.isFreeThrow && (
                  <circle
                    cx={ftToPxX(shot.ftX)}
                    cy={ftToPxY(shot.ftY)}
                    r="5"
                    fill={shot.made ? (shot.is3 ? "red" : "blue") : "none"}
                    stroke= {shot.made ? "white" : (shot.is3 ? "red" : "blue")}
                    strokeWidth="1"
                  />
                )}
                {debug && !shot.isFreeThrow && (
                  <>
                    <line
                      x1={ftToPxX(shot.ftX)}
                      y1={ftToPxY(shot.ftY)}
                      x2={targetRimX}
                      y2={targetRimY}
                      stroke="rgba(0,0,0,0.2)"
                    />
                    <text
                      x={ftToPxX(shot.ftX) + 8}
                      y={ftToPxY(shot.ftY) - 8}
                      fontSize={10}
                      fill="#222">
                      {shot.is3 ? "3PT" : "2PT"} ({Math.round(shot.distFt)})
                    </text>
                  </>
                )}
              </g>
            );
        })}
      </svg>
      </div>

      {/* Controls */}
      <div
        className="buttons-group"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          className={`game-control-btn ${
            selectedControl === "debug" ? "selected" : ""
          }`}
          onClick={() => {
            setDebug((prev) => !prev);
            setSelectedControl("debug");
          }}
        >
          {debug ? "Hide Debug" : "Show Debug"}
        </button>
        <button
          className="game-control-btn"
          onClick={() => onUndo()}
          disabled={shots.length === 0}
        >
          Undo Last Shot
        </button>
        <button
          className="game-control-btn"
          onClick={() => {
            setPendingShot({ isFreeThrow: true, flipCourt });
            setPopupStep("player");
          }}
        >
          Free Throw
        </button>
      </div>

      {/* Popup: player selection */}
      {popupStep === "player" && pendingShot && (
        <div className="popup">
          {pendingShot.isFreeThrow ? (
            <h3>Select Shooter (Free Throw)</h3>
          ) : (
            <h3>
              Select Shooter (
              {pendingShot.courtSide === "away" ? awayTeamName : homeTeamName})
            </h3>
          )}

          {pendingShot.isFreeThrow ? (
            <div className="free-throw-columns">
              <div className="team-column">
                <h4>{flipCourt ? awayTeamName : homeTeamName }</h4>
                <ul>
                  {leftColumnPlayers.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setPendingShot({
                            ...pendingShot,
                            playerId: p.id,
                            teamId: p.teamId,
                          });
                          setPopupStep("result");
                        }}
                      >
                        #{p.number} - {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="team-column">
                <h4>{flipCourt ? homeTeamName : awayTeamName}</h4>
                <ul>
                  {rightColumnPlayers.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setPendingShot({
                            ...pendingShot,
                            playerId: p.id,
                            teamId: p.teamId,
                          });
                          setPopupStep("result");
                        }}
                      >
                        #{p.number} - {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <ul>
              {(pendingShot.courtSide === "away"
                ? activeAwayPlayers
                : activeHomePlayers
              ).map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      setPendingShot({
                        ...pendingShot,
                        playerId: p.id,
                        teamId:
                          pendingShot.courtSide === "away"
                            ? awayTeamId
                            : homeTeamId,
                      });
                      setPopupStep("result");
                    }}
                  >
                    #{p.number} - {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => {
              setPendingShot(null);
              setPopupStep(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Popup: result */}
      {popupStep === "result" && pendingShot && (
        <div className="popup">
          <h3>Shot Result</h3>
          <ul>
            <li>
              <button onClick={() => finalizeShot(true)}>Made</button>
            </li>
            <li>
              <button onClick={() => finalizeShot(false)}>Missed</button>
            </li>
            <li>
              <button
                onClick={() => {
                  setPendingShot(null);
                  setPopupStep(null);
                }}
              >
                Cancel
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}