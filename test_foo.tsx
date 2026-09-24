import React, { useState, useEffect } from 'react';
import { Play, Plus, Minus, Calendar, Users, Zap, Clock, ShieldAlert, ClipboardEdit } from 'lucide-react';
import { MOCK_PLAYERS } from '../data/players';
import { Player } from '../types';
import { LiveMatch } from './LiveMatch';
import { ManualMatchEntry } from './ManualMatchEntry';
import { useTeam } from '../context/TeamContext';
import { db } from '../services/db';

type MatchPhase = 'hub' | 'callup' | 'live' | 'manual';

interface MatchDashboardProps {
  onNavigate?: (view: any) => void;
}

export function MatchDashboard({ onNavigate }: MatchDashboardProps) {
  const [phase, setPhase] = useState<MatchPhase>('hub');
  const [activeTeam] = [useTeam().activeTeam];
  
  // Replace the whole file by editing the raw file contents safely using run_command replacing parts.
