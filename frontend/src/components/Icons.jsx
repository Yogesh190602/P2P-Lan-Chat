import React from 'react';
import { VscFiles, VscSourceControl, VscExtensions } from 'react-icons/vsc';

function Icons() {
  return (
    <div>
      <h3>VSCode Icons in React</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
        <VscFiles />
        <span>File Explorer</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
        <VscSourceControl />
        <span>Source Control</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
        <VscExtensions />
        <span>Extensions</span>
      </div>
    </div>
  );
}

export default Icons;
