import React, { useCallback, useContext, useMemo } from "react";

import { MainContext } from "@_redux/main";

import IFrame from "./iFrame";
import { StageViewProps } from "./types";

export default function StageView(props: StageViewProps) {
  const { iframeSrc, setActivePanel } = useContext(MainContext);

  const onPanelClick = useCallback(() => {
    setActivePanel("stage");
  }, []);

  return useMemo(() => {
    return (
      <>
        <div id="StageView" className="view" onClick={onPanelClick}>
          <IFrame />
        </div>
      </>
    );
  }, [iframeSrc, onPanelClick]);
}
