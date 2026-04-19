/** API origin — single place to change for local dev. */
export const API_BASE = 'http://localhost:8000';

/** Stable order for displaying stored UI adaptation state. */
export const UI_ELEMENT_IDS_IN_ORDER = [
  'Menu_Dropdown_Button',
  'Home_Page_Text_Content',
  'Community_Project_Grid',
  'Workspace_Left_Buttons',
  'Profile_Display_Info',
];

/** Human-readable names for each tracked UI element (session keys). */
export const UI_ELEMENT_LABELS = {
  Menu_Dropdown_Button: 'Menu button',
  Home_Page_Text_Content: 'Home page text',
  Community_Project_Grid: 'Community project grid',
  Workspace_Left_Buttons: 'Workspace left buttons',
  Profile_Display_Info: 'Profile display',
};

export async function fetchUserSession(sessionId) {
  const response = await fetch(`${API_BASE}/api/user_session/${sessionId}`);
  if (!response.ok) throw new Error('Could not load session from the server.');
  return response.json();
}
