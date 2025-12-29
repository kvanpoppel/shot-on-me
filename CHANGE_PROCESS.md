# Change Management Process

## Core Principles
1. **Preserve First**: Never break working functionality
2. **Test Before Change**: Verify current state before modifying
3. **Incremental Updates**: Small, tested changes only
4. **Document State**: Note what works before changing
5. **Rollback Ready**: Changes must be easily reversible

## Before Making Any Change

### 1. Document Current State
- [ ] Identify what currently works
- [ ] Note any dependencies
- [ ] Check related features
- [ ] Document current behavior

### 2. Plan the Change
- [ ] Define exact scope of change
- [ ] Identify what will NOT change
- [ ] Plan rollback strategy
- [ ] Consider impact on other features

### 3. Make Change Safely
- [ ] Make minimal changes only
- [ ] Preserve existing code paths
- [ ] Add new code, don't replace working code
- [ ] Keep backward compatibility

### 4. Verify After Change
- [ ] Test the new feature works
- [ ] Verify existing features still work
- [ ] Check for regressions
- [ ] Confirm no breaking changes

## Change Checklist

Before submitting any change, verify:
- ✅ All existing functionality preserved
- ✅ No breaking changes introduced
- ✅ Related features still work
- ✅ Error handling maintained
- ✅ User experience not degraded
- ✅ Performance not worsened

## Red Flags - STOP and Reconsider
- Removing working code
- Changing core authentication flows
- Modifying database schemas without migration
- Breaking API contracts
- Removing error handling
- Changing user-facing features without testing

## Priority Order
1. **Stability** - Keep what works working
2. **Testing** - Verify before and after
3. **Documentation** - Note what changed
4. **Enhancement** - Add new features carefully

