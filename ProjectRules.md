The application MUST enforce strict Role-Based Access Control (RBAC). This is a core architectural requirement and must be implemented at both the frontend and backend. The frontend should only display permitted UI, while the backend must always validate permissions regardless of what the frontend sends.

There are only two roles:

1. Admin
2. Employee

==================================================================
ADMIN PERMISSIONS
==================================================================

Admins have unrestricted access to the system.

Admins can:

- View every employee
- Create, edit and delete employees
- View every project
- View every client
- View every invoice
- View every service
- View every attendance record
- View every task
- Create tasks
- Assign tasks
- Edit any task
- Delete any task
- View every bug ticket
- Assign bug tickets
- Close/Reopen bug tickets
- View all reports
- View login history
- View activity logs
- Manage system settings
- Manage company calendar
- Manage API keys
- Manage documents
- Access every module

If data exists in the system, Admin can access it.

==================================================================
EMPLOYEE PERMISSIONS
==================================================================

Employees are restricted to THEIR OWN DATA ONLY.

Employees MUST NEVER be able to access another employee's information.

Employees can ONLY see:

- Their own profile
- Their own documents
- Their own attendance
- Their own login history
- Their own activity
- Their own tasks
- Their own bug tickets
- Their own notifications
- Their own calendar
- Their own settings

For Projects:

Employees can only view projects they are assigned to.

They must NOT see:

- Projects assigned to other employees
- Project financials
- Client invoices
- Internal admin notes

For Tasks:

Employees can:

- View ONLY tasks assigned to themselves.
- Update ONLY their own task status.
- Comment ONLY on their own assigned tasks.

Employees must NEVER see:

- Tasks assigned to other employees.

For Bug Tickets:

Employees can:

- Raise tickets.
- View tickets they created.
- View tickets assigned to them.
- Update tickets assigned to them.

Employees must NEVER see:

- Tickets belonging to other employees unless they are assigned.

For Attendance:

Employees can ONLY view:

- Their own attendance
- Their own working hours
- Their own break history

Never show attendance of other employees.

For Employee Directory:

Employees should only see basic public information about coworkers if required, such as:

- Name
- Designation
- Department
- Company Email

Never expose:

- Personal phone numbers
- Personal email
- Address
- Government IDs
- Documents
- Salary
- Emergency contacts
- Attendance
- Login history
- Activity logs

==================================================================
BACKEND SECURITY (MANDATORY)
==================================================================

Do NOT rely on the frontend for security.

Every API endpoint must validate:

- User authentication
- User role
- Resource ownership

Example:

GET /employees/:id

If role == Employee:
Only return data when employee.id == loggedInUser.employeeId
Otherwise return HTTP 403 Forbidden.

GET /tasks

If role == Employee:
Return ONLY tasks where assignedEmployee == loggedInUser.employeeId.

GET /attendance

If role == Employee:
Return ONLY attendance belonging to loggedInUser.employeeId.

Never return all records and filter on the frontend.

Filtering must always happen in the backend database query.

==================================================================
FRONTEND RULES
==================================================================

Render the UI based on the authenticated user's role.

Admin Dashboard:

- Show all modules.
- Show all statistics.
- Show all employees.

Employee Dashboard:

- Show only personal information.
- Show only assigned tasks.
- Show only personal attendance.
- Show only personal tickets.
- Never show company-wide statistics.
- Never show employee management.
- Never show admin controls.

==================================================================
NON-NEGOTIABLE RULE
==================================================================

Assume EVERY employee is a normal employee unless the logged-in user's role is "Admin".

Whenever implementing any feature, first ask:

"Should an Employee be able to access this?"

If the answer is not explicitly YES, then restrict it to Admin only.

Security and data isolation take priority over convenience.
