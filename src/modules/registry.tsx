import type { Dispatch, SetStateAction } from 'react';
import { ChatModule } from '../components/Chat/Chat';
import { CombatModule } from '../components/Combat/Combat';
import { ContactsModule } from '../components/Contacts/Contacts';
import { DiceModule } from '../components/Dice/Dice';
import { EmailModule } from '../components/Email/Email';
import { EloModule } from '../components/Elo/Elo';
import { FilesModule } from '../components/Files/Files';
import { FixerBoardModule } from '../components/FixerBoard/FixerBoard';
import { HackingModule } from '../components/Hacking/Hacking';
import { JackIn } from '../components/JackIn/JackIn';
import { JournalModule } from '../components/Journal/Journal';
import { KiriHouCanvas } from '../components/KiriHouCanvas/KiriHouCanvas';
import { NetSearchModule } from '../components/NetSearch/NetSearch';
import RunnerModule from '../components/Runner/Runner';
import { SettingsModule } from '../components/Settings/Settings';
import { SignalBoard } from '../components/SignalBoard/SignalBoard';
import { CharacterSheetModule } from '../components/CharacterSheet/CharacterSheet';
import { GMDashboardModule } from '../components/Dashboard/Dashboard';
import { UserManagementModule } from '../components/UserManagement/UserManagement';
import type { AppModule, MeshUser } from '../types';
import type { ToastMessage } from '../components/Toast/Toast';

export type ModuleEntry = {
  id: AppModule;
  label: string;
  icon: string;
  gmOnly?: boolean;
  ghostSafe?: boolean;
};

export type SepEntry = { separator: true; gmOnly?: boolean };
export type NavEntry = ModuleEntry | SepEntry;

export const isSeparator = (entry: NavEntry): entry is SepEntry => 'separator' in entry;

export interface ModuleRenderContext {
  user: MeshUser;
  onLogout: () => void;
  onSchemeChange: (scheme: string) => void;
  currentScheme: string;
  customColour: string;
  onCustomColourChange: (colour: string) => void;
  triggerToast: (type: ToastMessage['type'], message: string) => void;
  setUnreadEmails: Dispatch<SetStateAction<number>>;
  setUnreadChat: Dispatch<SetStateAction<number>>;
  setNewFiles: Dispatch<SetStateAction<number>>;
  handleCombatActiveChange: (active: boolean) => void;
}

export const MODULE_REGISTRY: ModuleEntry[] = [
  { id: 'email', label: 'EMAIL', icon: '✉', ghostSafe: true },
  { id: 'chat', label: 'CHAT', icon: '⇩' },
  { id: 'netsearch', label: 'NET', icon: '◎', ghostSafe: true },
  { id: 'elo', label: 'ELO', icon: '✦' },
  { id: 'contacts', label: 'CONTACTS', icon: '◆', ghostSafe: true },
  { id: 'files', label: 'FILES', icon: '▤', ghostSafe: true },
  { id: 'sheet', label: 'SHEET', icon: '◈' },
  { id: 'dice', label: 'DICE', icon: '⚄' },
  { id: 'combat', label: 'COMBAT', icon: '⚔' },
  { id: 'runner', label: 'RUNNER', icon: '▸' },
  { id: 'hacking', label: 'JACK IN', icon: '⌬' },
  { id: 'fixerboard', label: 'FIXERS', icon: '◆', ghostSafe: true },
  { id: 'kirihOU', label: 'KIRI HOU', icon: '◎' },
  { id: 'signalboard', label: 'SIGNAL BOARD', icon: '◈', gmOnly: true },
  { id: 'dashboard', label: 'DASHBOARD', icon: '◧', gmOnly: true },
  { id: 'users', label: 'USERS', icon: '⊕', gmOnly: true },
  { id: 'journal', label: 'JOURNAL', icon: '◉', gmOnly: true },
  { id: 'settings', label: 'CONFIG', icon: '⚙' },
];

export const NAV_LIST: NavEntry[] = [
  MODULE_REGISTRY[0],
  MODULE_REGISTRY[1],
  MODULE_REGISTRY[2],
  MODULE_REGISTRY[3],
  MODULE_REGISTRY[4],
  MODULE_REGISTRY[5],
  { separator: true },
  MODULE_REGISTRY[6],
  MODULE_REGISTRY[7],
  MODULE_REGISTRY[8],
  MODULE_REGISTRY[9],
  MODULE_REGISTRY[10],
  MODULE_REGISTRY[11],
  MODULE_REGISTRY[12],
  { separator: true, gmOnly: true },
  MODULE_REGISTRY[13],
  MODULE_REGISTRY[14],
  MODULE_REGISTRY[15],
  MODULE_REGISTRY[16],
  { separator: true },
  MODULE_REGISTRY[17],
];

export const GHOST_SAFE_MODULES = MODULE_REGISTRY
  .filter((module): module is ModuleEntry & { ghostSafe: true } => module.ghostSafe === true)
  .map(module => module.id);

export function getModuleEntry(moduleId: AppModule): ModuleEntry | undefined {
  return MODULE_REGISTRY.find(module => module.id === moduleId);
}

export function getVisibleModules(user: MeshUser): ModuleEntry[] {
  return MODULE_REGISTRY.filter(module => !module.gmOnly || user.is_gm);
}

export function renderAppModule(moduleId: AppModule, ctx: ModuleRenderContext) {
  switch (moduleId) {
    case 'email':
      return <EmailModule user={ctx.user} onUnreadChange={ctx.setUnreadEmails} />;
    case 'chat':
      return (
        <JackIn moduleId="chat">
          <ChatModule
            user={ctx.user}
            onUnreadChange={ctx.setUnreadChat}
            isActive
            onToast={(msg) => ctx.triggerToast('chat', msg)}
          />
        </JackIn>
      );
    case 'netsearch':
      return <JackIn moduleId="netsearch"><NetSearchModule user={ctx.user} /></JackIn>;
    case 'elo':
      return <EloModule user={ctx.user} />;
    case 'contacts':
      return <ContactsModule user={ctx.user} />;
    case 'files':
      return (
        <JackIn moduleId="files">
          <FilesModule
            user={ctx.user}
            onNewFilesChange={ctx.setNewFiles}
            onToast={(msg) => ctx.triggerToast('file', msg)}
          />
        </JackIn>
      );
    case 'sheet':
      return <CharacterSheetModule user={ctx.user} />;
    case 'dice':
      return <DiceModule user={ctx.user} />;
    case 'combat':
      return <CombatModule user={ctx.user} onCombatActiveChange={ctx.handleCombatActiveChange} />;
    case 'runner':
      return <RunnerModule />;
    case 'hacking':
      return <HackingModule user={ctx.user} />;
    case 'fixerboard':
      return <JackIn moduleId="fixerboard"><FixerBoardModule user={ctx.user} /></JackIn>;
    case 'kirihOU':
      return <KiriHouCanvas user={ctx.user} />;
    case 'signalboard':
      return <SignalBoard user={ctx.user} />;
    case 'dashboard':
      return <GMDashboardModule user={ctx.user} />;
    case 'users':
      return <UserManagementModule user={ctx.user} />;
    case 'journal':
      return <JournalModule user={ctx.user} />;
    case 'settings':
      return (
        <SettingsModule
          user={ctx.user}
          onLogout={ctx.onLogout}
          onSchemeChange={ctx.onSchemeChange}
          currentScheme={ctx.currentScheme}
          customColour={ctx.customColour}
          onCustomColourChange={ctx.onCustomColourChange}
        />
      );
  }
}

export function renderGhostModule(moduleId: AppModule, user: MeshUser) {
  switch (moduleId) {
    case 'email':
      return <EmailModule user={user} onUnreadChange={() => {}} />;
    case 'netsearch':
      return <NetSearchModule user={user} />;
    case 'contacts':
      return <ContactsModule user={user} />;
    case 'fixerboard':
      return <FixerBoardModule user={user} />;
    case 'files':
      return <FilesModule user={user} onNewFilesChange={() => {}} onToast={() => {}} />;
    default:
      return null;
  }
}
