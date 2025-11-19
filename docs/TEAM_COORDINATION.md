# Team Coordination Plan
## Academic Marketplace - Multi-Agent Collaboration

**Project Coordinator**: Project Orchestrator Agent
**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Timeline**: Weeks 4-5 (Frontend Development Phase)

---

## Table of Contents

1. [Team Structure](#team-structure)
2. [Communication Protocols](#communication-protocols)
3. [Daily Standup Format](#daily-standup-format)
4. [Backend Support Sessions](#backend-support-sessions)
5. [Code Review Process](#code-review-process)
6. [QA Handoff Process](#qa-handoff-process)
7. [Issue Escalation](#issue-escalation)
8. [Sprint Schedule](#sprint-schedule)
9. [Collaboration Matrix](#collaboration-matrix)

---

## Team Structure

### Core Team Members

**Project Coordinator** (orchestrator)
- **Role**: Overall project coordination, quality gates enforcement
- **Responsibilities**:
  - Sprint planning and tracking
  - Epic prioritization
  - Quality gate validation
  - Inter-team coordination
  - Risk management
  - Status reporting

**Frontend Lead** (frontend-dashboard-builder agent)
- **Role**: UI/UX implementation
- **Responsibilities**:
  - Build Next.js pages and components
  - Integrate with backend APIs
  - Implement state management (React Query, Context)
  - Write unit and integration tests
  - Ensure responsive design
  - Follow design system (Shadcn/ui)

**QA Lead** (qa-automation-engineer agent)
- **Role**: Quality assurance and testing
- **Responsibilities**:
  - Write E2E tests (Playwright)
  - Perform integration testing
  - Accessibility audits
  - Performance testing
  - Bug reporting and triage
  - Quality gate validation

**Backend Support** (backend team, support role)
- **Role**: API support and documentation
- **Responsibilities**:
  - Maintain API uptime
  - Answer API questions
  - Provide endpoint examples
  - Fix backend bugs (if discovered)
  - No new feature development (backend is complete)

---

## Communication Protocols

### 1. Daily Standups

**Frequency**: Every weekday
**Time**: 9:00 AM (15 minutes max)
**Attendees**: Coordinator, Frontend Lead, QA Lead
**Format**: Asynchronous or synchronous

**Template:**

```markdown
## Daily Standup - [Date]

### Frontend Lead
**Yesterday**: Completed login page UI
**Today**: Implement protected route wrapper
**Blockers**: None

### QA Lead
**Yesterday**: Set up Playwright testing environment
**Today**: Write E2E tests for authentication flow
**Blockers**: Waiting for protected routes to be deployed

### Coordinator
**Yesterday**: Reviewed API documentation
**Today**: Epic 1 progress check, prepare Epic 2 kickoff
**Blockers**: None
```

**Coordinator Actions After Standup:**
- Update project tracking board
- Assign tasks if needed
- Flag risks to stakeholders

---

### 2. Backend Support Sessions

**Frequency**: Tuesday & Thursday
**Time**: 2:00 PM (30-60 minutes)
**Attendees**: Coordinator, Frontend Lead, Backend Support (as needed)

**Purpose:**
- Clarify API endpoint behavior
- Test edge cases together
- Debug integration issues
- Validate request/response formats

**Preparation:**
- Frontend Lead prepares questions in advance
- Coordinator reviews API documentation beforehand
- Backend Support has local environment running

**Sample Questions:**
- "What happens if I call POST /purchases with an invalid productId?"
- "How is the accountPassword encrypted? Do I need to decrypt it client-side?"
- "Can I filter products by multiple categories at once?"

---

### 3. Epic Kickoff Meetings

**When**: At the start of each epic
**Duration**: 45-60 minutes
**Attendees**: All team members

**Agenda:**
1. Review epic goals and user stories
2. Review acceptance criteria
3. Identify API endpoints needed
4. Discuss technical approach
5. Identify risks and dependencies
6. Assign tasks
7. Set quality gates

**Deliverable**: Epic task breakdown with assignments

---

### 4. Epic Review Meetings

**When**: At the completion of each epic
**Duration**: 30-45 minutes
**Attendees**: All team members

**Agenda:**
1. Demo completed features
2. Review quality gate results
3. Discuss what went well
4. Discuss what could be improved
5. Identify tech debt
6. Plan next epic

**Deliverable**: Epic completion report

---

### 5. Ad-Hoc Collaboration

**Slack/Discord Channels** (Recommended):
- `#frontend-dev` - Frontend development discussions
- `#qa-testing` - Testing and bug reports
- `#backend-support` - Backend API questions
- `#general` - General project updates

**Response Time SLA:**
- Urgent (blocker): < 1 hour
- High priority: < 4 hours
- Normal: < 24 hours

---

## Daily Standup Format

### Asynchronous Standup (Written)

Post in project channel by 9:00 AM daily:

```
@frontend-dashboard-builder
✅ Yesterday: [Completed tasks]
🔨 Today: [Planned tasks]
🚧 Blockers: [None / Description]

@qa-automation-engineer
✅ Yesterday: [Completed tasks]
🔨 Today: [Planned tasks]
🚧 Blockers: [None / Description]
```

### Synchronous Standup (Video/Voice)

**Structure (15 min max):**
1. Frontend Lead update (5 min)
2. QA Lead update (5 min)
3. Coordinator summary and action items (5 min)

**Rules:**
- Keep updates brief and focused
- Raise blockers immediately
- Detailed discussions happen after standup
- No problem-solving during standup (unless < 2 min)

---

## Backend Support Sessions

### Preparation Checklist

**Frontend Lead Preparation:**
- [ ] List all API questions
- [ ] Prepare example requests (curl/Postman)
- [ ] Note any unexpected API behavior
- [ ] Identify missing documentation

**Backend Support Preparation:**
- [ ] Review questions in advance
- [ ] Have local dev environment running
- [ ] Prepare to demonstrate endpoints
- [ ] Have database access ready (if needed)

**Coordinator Preparation:**
- [ ] Review API documentation
- [ ] Note any documentation gaps
- [ ] Prepare to document new findings

---

### Session Agenda

1. **Quick Triage** (5 min)
   - Review submitted questions
   - Prioritize by impact

2. **API Walkthroughs** (20-30 min)
   - Test endpoints together
   - Demonstrate expected behavior
   - Debug integration issues

3. **Documentation Updates** (10 min)
   - Note any API behavior clarifications
   - Update API_DOCUMENTATION.md

4. **Action Items** (5 min)
   - Assign follow-up tasks
   - Schedule next session if needed

---

### Example Support Session

**Question**: "How do I handle product purchases when the user's balance is insufficient?"

**Backend Walkthrough:**
```bash
# Test with user who has $5 balance
curl -X POST http://localhost:3000/api/v1/purchases \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_with_price_20"}'

# Response:
{
  "error": "Insufficient balance. Required: 20.00 USD, Available: 5.00 USD"
}
```

**Frontend Implementation:**
```typescript
try {
  await purchaseProduct(productId);
} catch (error) {
  if (error.status === 403 && error.message.includes('Insufficient')) {
    toast.error('You don\'t have enough balance. Please recharge your wallet.');
    router.push('/dashboard/seller/wallet');
  }
}
```

**Documentation Update:**
```markdown
### Error: 403 Forbidden
**Cause**: Insufficient wallet balance
**Response**:
{
  "error": "Insufficient balance. Required: X USD, Available: Y USD"
}
**Frontend Handling**: Redirect to wallet page with recharge prompt
```

---

## Code Review Process

### When to Request Review

- After completing each epic
- After implementing critical features (authentication, purchases)
- Before merging to main branch

---

### Code Review Checklist

**Functionality:**
- [ ] All user stories completed
- [ ] Acceptance criteria met
- [ ] No regressions introduced

**Code Quality:**
- [ ] TypeScript: No `any` types
- [ ] ESLint: No errors, minimal warnings
- [ ] Consistent naming conventions
- [ ] Code is DRY (Don't Repeat Yourself)

**Testing:**
- [ ] Unit tests written and passing
- [ ] Integration tests for critical paths
- [ ] E2E tests for user flows
- [ ] Test coverage > 80%

**Security:**
- [ ] No secrets in code
- [ ] Input validation implemented
- [ ] XSS prevention (sanitize user input)
- [ ] JWT token stored securely

**Performance:**
- [ ] No unnecessary rerenders
- [ ] Images optimized
- [ ] Code splitting used for large components
- [ ] API calls optimized (React Query caching)

**UX/UI:**
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states implemented
- [ ] Error states handled
- [ ] Success feedback (toasts, messages)

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] ARIA labels on interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader tested

---

### Code Review Workflow

1. **Create Pull Request**
   - Branch: `feature/epic-N-description`
   - Title: `[Epic N] Description`
   - Description: Summary of changes, testing notes

2. **Automated Checks**
   - CI runs linter
   - CI runs tests
   - CI checks TypeScript compilation

3. **Peer Review**
   - Coordinator reviews code
   - Provides feedback within 24 hours
   - Requests changes or approves

4. **Address Feedback**
   - Frontend Lead fixes issues
   - Pushes new commits
   - Requests re-review

5. **Final Approval**
   - Coordinator approves PR
   - QA Lead confirms tests passing

6. **Merge**
   - Squash and merge to main
   - Delete feature branch

---

## QA Handoff Process

### When to Hand Off to QA

- After completing each epic
- After fixing critical bugs
- Before production deployment

---

### QA Handoff Checklist

**Documentation:**
- [ ] User stories and acceptance criteria shared
- [ ] Test data requirements documented
- [ ] Known limitations documented

**Environment:**
- [ ] Feature deployed to staging
- [ ] Test users created (if needed)
- [ ] Test data seeded (if needed)

**Communication:**
- [ ] QA Lead notified of handoff
- [ ] Demo scheduled (optional)
- [ ] Slack message posted with PR link

---

### QA Testing Workflow

1. **Review Requirements**
   - QA reviews user stories
   - QA reviews acceptance criteria

2. **Test Planning**
   - QA writes test cases
   - QA identifies edge cases

3. **Execution**
   - QA performs manual testing
   - QA runs automated E2E tests
   - QA checks accessibility
   - QA tests responsiveness

4. **Bug Reporting**
   - QA creates bug tickets
   - QA assigns severity
   - QA provides steps to reproduce

5. **Re-Test After Fixes**
   - Frontend fixes bugs
   - QA re-tests
   - QA signs off

6. **Sign-Off**
   - QA approves epic completion
   - Coordinator marks epic as done

---

### QA Bug Report Template

```markdown
**Title**: [Component] Brief description

**Epic**: Epic 4 - Seller Dashboard
**Severity**: Critical / High / Medium / Low
**Assignee**: @frontend-dashboard-builder

**Environment**:
- Browser: Chrome 119
- OS: macOS 14
- URL: /dashboard/seller/marketplace

**Steps to Reproduce**:
1. Login as seller
2. Click "Buy Now" on any product
3. Click "Confirm Purchase"
4. Observe error

**Expected Behavior**:
Should show success modal with account credentials

**Actual Behavior**:
Shows error: "TypeError: Cannot read property 'accountPassword' of undefined"

**Screenshots**:
[Attach screenshot]

**Console Errors**:
```
TypeError: Cannot read property 'accountPassword' of undefined
  at PurchaseModal.tsx:45
```

**Suggested Fix** (optional):
Check if response.product exists before accessing accountPassword
```

---

## Issue Escalation

### Escalation Levels

**Level 1: Team-Level Resolution**
- **Who**: Frontend Lead + QA Lead
- **Examples**: Minor bugs, styling issues, test failures
- **Resolution Time**: < 1 day

**Level 2: Coordinator Intervention**
- **Who**: Coordinator + affected team members
- **Examples**: Blockers, API confusion, inter-team conflicts
- **Resolution Time**: < 4 hours

**Level 3: Backend Support Required**
- **Who**: Coordinator + Backend Support
- **Examples**: API bugs, missing endpoints, data inconsistencies
- **Resolution Time**: < 24 hours

**Level 4: Stakeholder Decision**
- **Who**: Coordinator + Project Stakeholder
- **Examples**: Scope changes, timeline adjustments, resource needs
- **Resolution Time**: < 48 hours

---

### When to Escalate

**Escalate to Coordinator if:**
- Blocked for > 2 hours
- Unclear requirements
- API behavior doesn't match documentation
- Quality gate failure

**Escalate to Backend Support if:**
- API returns unexpected errors
- Endpoint not working as documented
- Data corruption suspected

**Escalate to Stakeholder if:**
- Epic completion at risk
- Scope change required
- Timeline adjustment needed

---

## Sprint Schedule

### Week 4: Core Features

**Monday (Day 1)**
- **Morning**: Epic 1 Kickoff Meeting
- **Afternoon**: Frontend starts login/register pages
- **QA**: Set up testing environment
- **Evening**: Daily standup summary

**Tuesday (Day 2)**
- **Morning**: Frontend continues Epic 1
- **Afternoon**: Backend Support Session
- **QA**: Write E2E test scaffolding
- **Evening**: Daily standup summary

**Wednesday (Day 3)**
- **Morning**: Frontend completes Epic 1
- **Afternoon**: Epic 1 Code Review
- **QA**: Begin testing Epic 1
- **Evening**: Daily standup summary

**Thursday (Day 4)**
- **Morning**: Epic 4 Kickoff (Seller Dashboard)
- **Afternoon**: Backend Support Session, Frontend starts marketplace
- **QA**: Epic 1 sign-off
- **Evening**: Daily standup summary

**Friday (Day 5)**
- **Morning**: Frontend continues marketplace
- **Afternoon**: Week 4 review meeting
- **QA**: Test marketplace (partial)
- **Evening**: Weekly summary report

---

### Week 5: Role-Specific Dashboards

**Monday (Day 6)**
- **Morning**: Frontend completes marketplace + purchase flow
- **Afternoon**: Epic 3 Kickoff (Provider Dashboard)
- **QA**: Epic 4 testing
- **Evening**: Daily standup summary

**Tuesday (Day 7)**
- **Morning**: Frontend works on provider CRUD
- **Afternoon**: Backend Support Session
- **QA**: Continue Epic 4 testing
- **Evening**: Daily standup summary

**Wednesday (Day 8)**
- **Morning**: Frontend completes Epic 3
- **Afternoon**: Epic 2 & 5 Kickoff (Admin + Affiliate)
- **QA**: Epic 4 sign-off, start Epic 3 testing
- **Evening**: Daily standup summary

**Thursday (Day 9)**
- **Morning**: Frontend works on Epic 2 + 5
- **Afternoon**: Backend Support Session
- **QA**: Epic 3 testing
- **Evening**: Daily standup summary

**Friday (Day 10)**
- **Morning**: Frontend completes remaining epics
- **Afternoon**: Final code review + QA
- **QA**: Full regression testing
- **Evening**: Sprint completion report

---

## Collaboration Matrix

### Epic 1: Authentication

| Task | Frontend | QA | Backend | Coordinator |
|------|----------|-------|---------|-------------|
| Design login page | Lead | Review UX | - | Approve |
| Integrate login API | Lead | - | Support | Review |
| Write E2E tests | - | Lead | - | Validate |
| Code review | Implement fixes | Validate | - | Lead |

---

### Epic 4: Seller Dashboard (Critical Path)

| Task | Frontend | QA | Backend | Coordinator |
|------|----------|-------|---------|-------------|
| Marketplace UI | Lead | Review | - | Approve |
| Purchase flow | Lead | - | Support | Review |
| Credentials display | Lead | Security review | - | Validate |
| Insufficient balance error | Lead | Test edge cases | Provide examples | Review |
| E2E purchase test | - | Lead | - | Validate |

---

### Epic 3: Provider Dashboard

| Task | Frontend | QA | Backend | Coordinator |
|------|----------|-------|---------|-------------|
| Product CRUD UI | Lead | Review | - | Approve |
| Create product API | Lead | - | Support | Review |
| Edit sold product (error) | Lead | Test | Clarify error | Validate |
| Delete product test | - | Lead | - | Validate |

---

## Status Reporting

### Weekly Progress Report

**Sent by**: Coordinator
**To**: Stakeholders
**When**: Every Friday, 5:00 PM

**Template:**

```markdown
# Weekly Progress Report - Week [N]
**Date**: [Date]
**Sprint**: Frontend Development (Weeks 4-5)

## Summary
- **Epics Completed**: Epic 1 (Authentication), Epic 4 (Seller - Partial)
- **Epics In Progress**: Epic 4 (Purchase flow)
- **Epics Planned**: Epic 3 (Provider), Epic 2 (Admin)

## Accomplishments
- ✅ Login and registration pages complete
- ✅ Protected routes implemented
- ✅ Marketplace browse page complete
- ✅ 45% of Epic 4 complete

## Metrics
- **Code Coverage**: 82%
- **E2E Tests Passing**: 15/18 (83%)
- **Bugs Open**: 3 (0 critical, 2 high, 1 medium)
- **Velocity**: 12 story points completed

## Blockers
- None

## Risks
- Purchase flow complexity may extend Epic 4 by 1 day
- Mitigation: Added buffer to Week 5

## Next Week Plan
- Complete Epic 4 (purchase flow)
- Start and complete Epic 3 (provider dashboard)
- Begin Epic 2 and 5

## Quality Gates Status
- ✅ Code quality: Passing
- ✅ Test coverage: Passing (> 80%)
- ⏳ E2E tests: In progress
- ✅ Accessibility: Passing
```

---

## Meeting Templates

### Epic Kickoff Meeting Agenda

```markdown
# Epic [N] Kickoff - [Title]
**Date**: [Date]
**Duration**: 45-60 min
**Attendees**: Coordinator, Frontend Lead, QA Lead

## Agenda

1. **Epic Overview** (10 min)
   - User stories review
   - Acceptance criteria
   - Business value

2. **Technical Design** (15 min)
   - API endpoints needed
   - Component breakdown
   - State management approach
   - Data flow

3. **Task Breakdown** (15 min)
   - List all tasks
   - Estimate effort
   - Assign ownership

4. **Quality Gates** (10 min)
   - Testing requirements
   - Code coverage targets
   - E2E scenarios

5. **Risks & Dependencies** (5 min)
   - Identify blockers
   - Note dependencies

6. **Q&A** (5 min)

## Action Items
- [ ] Task 1 - Assignee (Due date)
- [ ] Task 2 - Assignee (Due date)
```

---

### Epic Review Meeting Agenda

```markdown
# Epic [N] Review - [Title]
**Date**: [Date]
**Duration**: 30-45 min
**Attendees**: Coordinator, Frontend Lead, QA Lead

## Agenda

1. **Demo** (10 min)
   - Show completed features
   - Walk through user flows

2. **Quality Gates Review** (10 min)
   - Code coverage: [X%]
   - Tests passing: [X/Y]
   - Accessibility: [Pass/Fail]
   - Performance: [Lighthouse score]

3. **Retrospective** (15 min)
   - What went well?
   - What could be improved?
   - Action items for next epic

4. **Next Epic Preview** (5 min)
   - Brief overview
   - Schedule kickoff meeting

## Decisions
- [Decision 1]
- [Decision 2]

## Action Items
- [ ] Action 1 - Assignee
- [ ] Action 2 - Assignee
```

---

## Tools & Platforms

**Recommended Tools:**

**Project Management:**
- **Linear** or **Jira** - Issue tracking
- **GitHub Projects** - Kanban board

**Communication:**
- **Slack** or **Discord** - Team chat
- **Zoom** or **Google Meet** - Video calls

**Code Collaboration:**
- **GitHub** - Code repository
- **GitHub Actions** - CI/CD

**Documentation:**
- **Notion** or **Confluence** - Team wiki
- **Markdown files** (current approach) - In-repo docs

**Testing:**
- **Playwright Dashboard** - E2E test results
- **Codecov** - Code coverage tracking

---

## Success Criteria

**Team Coordination Success:**
- [ ] Zero blockers lasting > 4 hours
- [ ] All standups completed on time
- [ ] Backend support sessions productive
- [ ] Code reviews completed within 24 hours
- [ ] QA handoffs smooth (no missing info)
- [ ] Zero inter-team conflicts

**Delivery Success:**
- [ ] All epics completed on time
- [ ] Quality gates passed
- [ ] No critical bugs in production
- [ ] Stakeholders satisfied

---

## Contact Information

**Project Coordinator**
- **Availability**: Mon-Fri 9 AM - 6 PM
- **Response Time**: < 2 hours

**Frontend Lead**
- **Availability**: Mon-Fri 9 AM - 6 PM
- **Response Time**: < 4 hours

**QA Lead**
- **Availability**: Mon-Fri 9 AM - 6 PM
- **Response Time**: < 4 hours

**Backend Support**
- **Availability**: Tue/Thu 2-3 PM (support sessions)
- **Response Time**: < 24 hours

---

**Let's build an amazing product together!**
