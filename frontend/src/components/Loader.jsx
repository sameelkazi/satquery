import React from 'react';
import './Loader.css';

const Loader = () => {
  return (
    <div className="space-loader-wrapper">
      <div className="container">
        <div className="moon">
          <div className="crater crater1" />
          <div className="crater crater2" />
          <div className="crater crater3" />
          <div className="crater crater4" />
          <div className="crater crater5" />
          <div className="shadow" />
          <div className="eye eye-l" />
          <div className="eye eye-r" />
          <div className="mouth" />
          <div className="blush blush1" />
          <div className="blush blush2" />
        </div>
        <div className="orbit">
          <div className="rocket">
            <div className="window" />
            <div className="fire" />
            <div className="gas" />
            <div className="gas" />
            <div className="gas" />
            <div className="gas" />
            <div className="gas" />
            <div className="gas" />
            <div className="gas" />
          </div>
        </div>
        <div className="curve">
          <svg viewBox="0 0 500 500">
            <path id="loading" d="M73.2,148.6c4-6.1,65.5-96.8,178.6-95.6c111.3,1.2,170.8,90.3,175.1,97" />
            <text width={500}>
              <textPath xlinkHref="#loading">...loading...</textPath>
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Loader;
