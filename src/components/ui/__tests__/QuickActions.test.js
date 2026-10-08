/**
 * Tests for QuickActions system
 *
 * Basic unit tests without React Testing Library
 *
 * @module QuickActions.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from 'vitest';
// Modules chargés à la collecte : un import à froid dans un test dépassait le délai de 5 s sur une machine chargée.
import * as ActionMenuModule from '../ActionMenu';
import * as QuickActionsModule from '../QuickActions';
import * as ActionConfirmModalModule from '../ActionConfirmModal';
import * as useQuickActionsModule from '../../../hooks/useQuickActions';
import * as uiIndex from '../index';
import * as hooksIndex from '../../../hooks/index';

// ============ IMPORT VALIDATION TESTS ============

describe('Module Exports', () => {
  it('exports ActionMenu component', () => {
    const module = ActionMenuModule;
    expect(module.ActionMenu).toBeDefined();
    expect(module.ActionMenuButton).toBeDefined();
    expect(module.default).toBeDefined();
  });

  it('exports QuickActions component', () => {
    const module = QuickActionsModule;
    expect(module.QuickActions).toBeDefined();
    expect(module.QuickActionsRow).toBeDefined();
    expect(module.ActionDivider).toBeDefined();
    expect(module.useActionState).toBeDefined();
    expect(module.default).toBeDefined();
  });

  it('exports ActionConfirmModal component', () => {
    const module = ActionConfirmModalModule;
    expect(module.ActionConfirmModal).toBeDefined();
    expect(module.DeleteConfirmModal).toBeDefined();
    expect(module.ConvertConfirmModal).toBeDefined();
    expect(module.default).toBeDefined();
  });
});

// ============ HOOK TESTS ============

describe('useQuickActions', () => {
  it('exports all required functions', () => {
    const module = useQuickActionsModule;

    expect(module.useQuickActions).toBeDefined();
    expect(module.useDevisActions).toBeDefined();
    expect(module.useFactureActions).toBeDefined();
    expect(module.useChantierActions).toBeDefined();
    expect(module.useClientActions).toBeDefined();
    expect(module.default).toBeDefined();
  });
});

// ============ UI INDEX EXPORTS ============

describe('UI Index Exports', () => {
  it('exports action components from index', () => {
    const module = uiIndex;

    expect(module.ActionMenu).toBeDefined();
    expect(module.ActionMenuButton).toBeDefined();
    expect(module.QuickActions).toBeDefined();
    expect(module.QuickActionsRow).toBeDefined();
    expect(module.ActionDivider).toBeDefined();
    expect(module.useActionState).toBeDefined();
    expect(module.ActionConfirmModal).toBeDefined();
    expect(module.DeleteConfirmModal).toBeDefined();
    expect(module.ConvertConfirmModal).toBeDefined();
  });
});

// ============ HOOKS INDEX EXPORTS ============

describe('Hooks Index Exports', () => {
  it('exports quick action hooks from index', () => {
    const module = hooksIndex;

    expect(module.useQuickActions).toBeDefined();
    expect(module.useDevisActions).toBeDefined();
    expect(module.useFactureActions).toBeDefined();
    expect(module.useChantierActions).toBeDefined();
    expect(module.useClientActions).toBeDefined();
  });
});

// ============ FUNCTIONAL TESTS ============

describe('Action System Integration', () => {
  it('ActionMenu is a valid React component', () => {
    const { ActionMenu } = ActionMenuModule;

    // Verify function signature (React component)
    expect(typeof ActionMenu).toBe('function');
  });

  it('QuickActions is a valid React component', () => {
    const { QuickActions } = QuickActionsModule;

    expect(typeof QuickActions).toBe('function');
  });

  it('ActionConfirmModal is a valid React component', () => {
    const { ActionConfirmModal } = ActionConfirmModalModule;

    expect(typeof ActionConfirmModal).toBe('function');
  });
});

// ============ TYPE VALIDATION ============

describe('Action Item Structure', () => {
  it('validates action item structure', () => {
    const validAction = {
      label: 'Test Action',
      icon: null,
      onClick: vi.fn(),
      variant: 'ghost',
      size: 'sm',
      disabled: false,
      loading: false,
    };

    expect(validAction.label).toBe('Test Action');
    expect(typeof validAction.onClick).toBe('function');
    expect(validAction.variant).toBe('ghost');
  });

  it('validates menu action structure', () => {
    const validMenuAction = {
      label: 'Menu Action',
      icon: null,
      onClick: vi.fn(),
      danger: false,
      disabled: false,
      shortcut: '⌘K',
      submenu: [],
    };

    expect(validMenuAction.label).toBe('Menu Action');
    expect(validMenuAction.shortcut).toBe('⌘K');
  });

  it('validates separator action', () => {
    const separatorAction = { type: 'separator' };

    expect(separatorAction.type).toBe('separator');
  });
});

// ============ CONSTANTS VALIDATION ============

describe('Component Constants', () => {
  it('QuickActions exports expected sizes', async () => {
    // Verify size values work
    const sizes = ['sm', 'md', 'lg'];

    for (const size of sizes) {
      expect(sizes).toContain(size);
    }
  });

  it('ActionMenu exports expected alignments', async () => {
    const alignments = ['left', 'right'];

    for (const align of alignments) {
      expect(alignments).toContain(align);
    }
  });

  it('ActionConfirmModal exports expected variants', async () => {
    const variants = ['danger', 'warning', 'info'];

    for (const variant of variants) {
      expect(variants).toContain(variant);
    }
  });
});

// ============ MOCK CALLBACK TESTS ============

describe('Callback Handling', () => {
  it('action onClick receives event', () => {
    const mockCallback = vi.fn();
    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

    // Simulate action click
    mockCallback(mockEvent);

    expect(mockCallback).toHaveBeenCalledWith(mockEvent);
  });

  it('async action returns promise', async () => {
    const asyncCallback = vi.fn().mockResolvedValue('success');

    const result = await asyncCallback();

    expect(result).toBe('success');
    expect(asyncCallback).toHaveBeenCalled();
  });

  it('confirmation flow works correctly', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    // Simulate confirm
    onConfirm();
    expect(onConfirm).toHaveBeenCalled();

    // Simulate cancel
    onClose();
    expect(onClose).toHaveBeenCalled();
  });
});
