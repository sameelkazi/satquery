import React from 'react';
import './ThemeSwitch.css';

const ThemeSwitch = ({ isDark = true, onToggle }) => {
  return (
    <div className="bb8-toggle-wrapper" title={isDark ? "Switch to Daylight Mode" : "Switch to Deep Space Dark Mode"}>
      <label className="bb8-toggle">
        <input 
          className="bb8-toggle__checkbox" 
          type="checkbox" 
          checked={isDark}
          onChange={onToggle}
        />
        <div className="bb8-toggle__container">
          <div className="bb8-toggle__scenery">
            <div className="bb8-toggle__star" />
            <div className="bb8-toggle__star" />
            <div className="bb8-toggle__star" />
            <div className="bb8-toggle__star" />
            <div className="bb8-toggle__star" />
            <div className="bb8-toggle__star" />
            <div className="bb8-toggle__star" />
            <div className="tatto-1" />
            <div className="tatto-2" />
            <div className="gomrassen" />
            <div className="hermes" />
            <div className="chenini" />
            <div className="bb8-toggle__cloud" />
            <div className="bb8-toggle__cloud" />
            <div className="bb8-toggle__cloud" />
          </div>
          <div className="bb8">
            <div className="bb8__head-container">
              <div className="bb8__antenna" />
              <div className="bb8__antenna" />
              <div className="bb8__head" />
            </div>
            <div className="bb8__body" />
          </div>
          <div className="artificial__hidden">
            <div className="bb8__shadow" />
          </div>
        </div>
      </label>
    </div>
  );
};

export default ThemeSwitch;
