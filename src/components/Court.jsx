// src/components/Court.jsx
import React, { useRef, useState , useEffect } from "react";
import courtImage from "../images/FIBA_Court.svg";

export default function Court({ 
  onAddShot, 
  selectedPlayerId, 
  selectedTeamId, 
  onUndo, 
  shots,
  quarter
  }) {
  const svgRef = useRef(null);
  const [markers, setMarkers] = useState([]);
  const [debug, setDebug] = useState(false);
   const [selectedControl, setSelectedControl] = useState(null); 

  useEffect(() => {
    setMarkers(shots);
  }, [shots]);

  const COURT_WIDTH_FT = 91.9;
  const COURT_HEIGHT_FT = 49.2;
  const THREE_RADIUS_FT = 22.14567; // NBA/FIBA arc ~22 ft from rim
  const RIM_OFFSET_FT = 5.1673228; // distance from baseline
  const RIM_Y_FT = COURT_HEIGHT_FT / 2.005;
  const CORNER_THREE_RECT_WIDTH_FT = 10;
  const CORNER_THREE_RECT_HEIGHT_FT = 3.175;

  // Image/SVG dimensions (px)
  const COURT_WIDTH_PX = 797.19;
  const COURT_HEIGHT_PX = 427.98;

  // Scale helpers
  const scaleX = COURT_WIDTH_PX / COURT_WIDTH_FT;
  const scaleY = COURT_HEIGHT_PX / COURT_HEIGHT_FT;

  // Bounds for each corner 3 pointer rectangle
  const TopX = 0;
  const TopY = 0;
  const BottomY = COURT_HEIGHT_FT - CORNER_THREE_RECT_HEIGHT_FT;
  const RightX = COURT_WIDTH_FT - CORNER_THREE_RECT_WIDTH_FT;
  const rectWidthPx = ftToPxX(CORNER_THREE_RECT_WIDTH_FT);
  const rectHeightPx = ftToPxX(CORNER_THREE_RECT_HEIGHT_FT);
  const BottomYPx = ftToPxX(BottomY);
  const RightXPx = ftToPxX(RightX);

  // Convert rim + arc to px for drawing
  const rimLeftPx = { 
    x: ftToPxX(RIM_OFFSET_FT), 
    y: ftToPxY(RIM_Y_FT) };
  const rimRightPx = {
    x: ftToPxX(COURT_WIDTH_FT - RIM_OFFSET_FT),
    y: ftToPxY(RIM_Y_FT),
  };

  function ftToPxX(ftX) {
    return ftX * scaleX;
  }
  function ftToPxY(ftY) {
    return ftY * scaleY;
  }
  function pxToFtX(pxX) {
    return pxX / scaleX;
  }
  function pxToFtY(pxY) {
    return pxY / scaleY;
  }

  // Utility: convert mouse click to SVG coords
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

  // Handle shot placement
  function handlePointerDown(e) {
    if (!selectedPlayerId) {
      alert("Please select a player first!");
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const made = window.confirm("Was the shot made? Click OK for Made, Cancel for Missed");
    
    const svgP = toSVGPoint(e.clientX, e.clientY);
    if (!svgP) return;

    // Convert to real-world ft
    const ftX = pxToFtX(svgP.x);
    const ftY = pxToFtY(svgP.y);

    const { is3, distFt, courtSide, inCorner3, behindArc} = computeIsThree(ftX, ftY);
    const points = is3 ? 3 : 2;

    const newShot = {
      id: Date.now().toString(),
      playerId: selectedPlayerId,
      teamId: selectedTeamId,
      isFreeThrow: false,
      x,
      y,
      ftX,
      ftY,
      is3,
      distFt,
      courtSide,
      inCorner3,
      behindArc,
      made,
      points,
      quarter
    };

    onAddShot(newShot);

    setMarkers((prev) => [...prev, newShot]);
    console.log("Shot location:", newShot);
    console.log(is3 ? "3PT" : "2PT", "Distance:", Math.round(distFt), "ft");
  }

  // Check 3PT logic in real units
  function computeIsThree(ftX, ftY) {
    const useLeft = ftX < COURT_WIDTH_FT / 2;
    const rimX = useLeft ? RIM_OFFSET_FT : COURT_WIDTH_FT - RIM_OFFSET_FT;
    const rimY = RIM_Y_FT;
    const dx = ftX - rimX;
    const dy = ftY - rimY;
    const distFt = Math.hypot(dx, dy);

    // Check if the point is in any of the four boxes
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

    const inCorner3 = 
      inLeftTopCorner || 
      inLeftBottomCorner || 
      inRightTopCorner || 
      inRightBottomCorner;

    const behindArc = 
      distFt > THREE_RADIUS_FT;

    const is3 = inCorner3 || behindArc;
      return { 
        is3, 
        distFt, 
        courtSide: useLeft ? "left" : "right" , 
        inCorner3, 
        behindArc};
  }

  console.log(
    `
    Court Size: ${COURT_WIDTH_FT} FT x ${COURT_HEIGHT_FT} FT,
    Image Size: ${COURT_WIDTH_PX} PX x ${COURT_HEIGHT_PX} PX,
    Scale Helpers: X: ${scaleX}, Y: ${scaleY},
    Rims Offset Baseline: ${RIM_OFFSET_FT} FT,
    3 Pointer Radius from Rim: ${THREE_RADIUS_FT} FT,
    Corner 3 Pointers Rectangle Size: ${CORNER_THREE_RECT_WIDTH_FT} FT x ${CORNER_THREE_RECT_HEIGHT_FT} FT,
    `
  );

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
              x={TopX}
              y={TopY}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
            />
            <rect
              x={TopX}
              y={BottomYPx}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
            />
            <rect
              x={RightXPx}
              y={0}
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
          {markers.map((shot) => (
            <g key={shot.id}>
              {!shot.isFreeThrow && (
                <circle
                  cx={ftToPxX(shot.ftX)}
                  cy={ftToPxY(shot.ftY)}
                  r="5"
                  fill={shot.made ? (shot.is3 ? "red" : "blue") : "none" }
                  stroke= {shot.made ? "white" : (shot.is3 ? "red" : "blue")}
                  strokeWidth="1"
                />
              )}
              {debug && !shot.isFreeThrow && (
                <>
                  <line
                    x1={ftToPxX(shot.ftX)}
                    y1={ftToPxY(shot.ftY)}
                    x2={shot.courtSide === "left" ? rimLeftPx.x : rimRightPx.x}
                    y2={shot.courtSide === "left" ? rimLeftPx.y : rimRightPx.y}
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
          ))}
      </svg>
    </div>
    <div className="buttons-group" onPointerDown={(e) => e.stopPropagation()}>
        <button
          className={`game-control-btn ${selectedControl === 'debug' ? 'selected' : ''}`}
          onClick={() => {
            setDebug((prev) => !prev);
            setSelectedControl('debug');
          }}>
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
            if (!selectedPlayerId) {
              alert("Please select a player first!");
              return;
            }
            const made = window.confirm("Was the free throw made?");
            const newFT = {
              id: Date.now().toString(),
              playerId: selectedPlayerId,
              teamId: selectedTeamId,
              isFreeThrow: true,
              made,
              points: made ? 1 : 0,
              distFt: 15,
              quarter
            };
            onAddShot(newFT);
          }}
        >
          Free Throw
        </button>
      </div>
  </div>
);
}
