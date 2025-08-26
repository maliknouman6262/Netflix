// src/components/Toolbar.jsx
import React from 'react';
import { stages, sources, owners } from './data';

const Toolbar = ({ query, setQuery, filterCity, setFilterCity, filterSource, setFilterSource, filterStage, setFilterStage, filterOwner, setFilterOwner, uniqueCities, uniqueSources, uniqueOwners }) => {
  const handleClearFilters = () => {
    setQuery("");
    setFilterCity("");
    setFilterSource("");
    setFilterStage("");
    setFilterOwner("");
  };

  return (
    <section className="toolbar">
      <input
        id="q"
        className="input"
        placeholder="Search (name, city, phone, stage)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select id="fCity" className="input" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
        <option value="">All Cities</option>
        {uniqueCities.map(city => <option key={city}>{city}</option>)}
      </select>
      <select id="fSource" className="input" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
        <option value="">All Sources</option>
        {uniqueSources.map(source => <option key={source}>{source}</option>)}
      </select>
      <select id="fStage" className="input" value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
        <option value="">All Stages</option>
        {stages.map(stage => <option key={stage}>{stage}</option>)}
      </select>
      <select id="fOwner" className="input" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
        <option value="">All Owners</option>
        {uniqueOwners.map(owner => <option key={owner}>{owner}</option>)}
      </select>
      <button className="btn" onClick={handleClearFilters}>Clear</button>
    </section>
  );
};

export default Toolbar;