import React, { createContext, useContext } from 'react';

const FeeStructureContext = createContext({ feeOpen: false, panelWidth: '0px', closeFeeStructure: () => {} });

export const FeeStructureProvider = ({ feeOpen, panelWidth, closeFeeStructure, children }) => (
  <FeeStructureContext.Provider value={{ feeOpen, panelWidth, closeFeeStructure }}>
    {children}
  </FeeStructureContext.Provider>
);

export const useFeeStructure = () => useContext(FeeStructureContext);
