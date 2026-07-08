# API Plan – Swagger vs Admin Panel

**Swagger docs:** https://flterhomeapitemp.duckdns.org/api/docs

---

## 1. Swagger par jo APIs hain (reference)

Jab link open karo toh ye sections dikhenge. Neeche short list hai taake pata rahe **kya backend par hai** aur **hum kahan use kar rahe / kya missing hai**.

| Section | Method | Path | Notes |
|--------|--------|------|--------|
| **App** | GET | /api/v1 | Health/info |
| **Authentication** | POST | /auth/signup | Customer/Provider signup |
| | POST | /auth/login | |
| | POST | /auth/login/otp | |
| | POST | /auth/login/social | |
| | POST | /auth/token/refresh | ✓ |
| | POST | /auth/logout, /auth/logout/all | |
| | POST | /auth/otp/send, /auth/otp/verify | |
| | POST | /auth/forgot-password, /auth/reset-password | ✓ (admin uses /admin/auth/...) |
| | POST | /auth/change-password | ✓ |
| | GET | /auth/me | ✓ |
| | GET | /auth/permissions | ✓ |
| | GET | /auth/sessions | ✓ |
| | POST | /auth/sessions/revoke | ✓ |
| | GET | /auth/login-attempts/failed | ✓ |
| | GET | /auth/login-history | ✓ |
| | POST | /auth/user/status | ✓ |
| | POST | /auth/account/deactivate, reactivate | |
| | POST | /auth/user/force-logout | ✓ |
| **Admin · Authentication** | POST | /admin/auth/signup | ✓ |
| | POST | /admin/auth/login | ✓ |
| **Users** | PATCH | /users/profile | ✓ (admin.js updateUserProfile) |
| **Roles** | POST | /roles/assign, assign-by-name | ✓ |
| | DELETE | /roles/remove | ✓ |
| | GET | /roles/user/:userId | ✓ |
| | GET | /roles | ✓ |
| | POST | /roles/create | ✓ |
| **Service Categories** | GET | /service-categories (public) | ✓ |
| | GET/POST/PATCH | /admin/service-categories | ✓ |
| **Services** | GET | /services, /services/categories/:id, /services/:id | ✓ |
| | GET/POST/PATCH | /admin/services | ✓ |
| **Provider · Services** | GET/PUT | /providers/me/services | (provider app) |
| **Service Properties** | GET | /service-properties/service/:id | ✓ |
| | GET/POST/PATCH/DELETE | /admin/service-properties | ✓ |
| **Service Add-ons** | GET | /service-addons/service/:id | ✓ |
| | GET/POST/PATCH | /admin/service-addons | ✓ |
| **Pricing Matrix** | GET/POST/PATCH | /admin/pricing-matrix | ✓ |
| **Service Types** | GET | /service-types/... | ✓ |
| | GET/POST/PATCH + checklist | /admin/service-types | ✓ |
| **Size Categories** | GET | /size-categories (public) | ✓ |
| | GET/POST/PATCH/DELETE | /admin/size-categories | ✓ |
| **Customer · Orders** | POST/GET/PATCH... | /customer/orders | (customer app) |
| **Provider · Orders** | GET/POST... | /provider/orders | (provider app) |
| **Admin · Orders** | GET | /admin/orders | ✓ |
| | GET | /admin/orders/:id | ✓ |
| | POST | /admin/orders/:id/cancel, reassign, rebroadcast | ✓ |
| **Customer/Provider Stats** | GET | /customer/me/stats, /provider/me/stats | (apps) |
| **Customer · Vehicles** | CRUD | /customer/vehicles | (customer app) |
| **Admin Customers** | GET | /customers | ✓ |
| | GET | /customers/:id | ✓ |
| | PATCH | /customers/:id/status | ✓ |
| **Notifications** | POST | /notifications/fcm-token | ✓ |
| **Admin Providers** | GET | /service-providers | ✓ |
| | GET | /service-providers/:id | ✓ |

---

## 2. Admin panel mein kahan kya use ho raha hai

| Page / Feature | Jo APIs use ho rahi hain |
|----------------|--------------------------|
| **Login / Auth** | `login` (admin/auth/login), `refresh`, `forgotPassword`, `resetPassword` |
| **Dashboard** | `getMapLocations` (optional), Google Maps key from Settings/localStorage |
| **Orders** | `getAdminOrders`, `getAdminOrderDetails`, `cancelOrder`, `reassignOrder`, `rebroadcastOrder` |
| **Customers** | `getCustomers`, `getCustomerDetails`, `updateCustomerStatus`, `signupCustomer` |
| **Service Providers** | `getProviders`, `getProviderDetails`, `signupProvider` |
| **SP Requests** | (providers list / requests – same ya alag endpoint) |
| **Services** | `getServiceCategories`, `getServices`, create/update/delete service, addons, properties |
| **Pricing Matrix** | `getPricingMatrix`, create, update |
| **Service Types** | list, create, update, checklist CRUD |
| **Size Categories** | get, getById, create, update, delete |
| **Zones** | `getZones`, `createZone`, `updateZone`, `deleteZone` (backend path confirm karo) |
| **Settings** | `getRoles`, `getSettings`, `updateSettings`, `getPermissionMatrix`, `updatePermissionMatrix`; API key save = localStorage fallback (backend mein /admin/settings nahi hai) |
| **Account** | `getAdminProfile`, `updateAdminProfile`, `changeAdminPassword` |
| **Maps (Dashboard + Zones)** | Google Maps – key from Settings (API Keys) / localStorage / env |

---

## 3. Kya missing hai (backend ya frontend)

| Cheez | Status | Kahan chahiye |
|-------|--------|----------------|
| **GET/PATCH /admin/settings** | Backend par nahi hai | Settings → General, API Keys, Email, Notifications, Security save. Abhi API Keys localStorage se save ho rahi hain. |
| **GET/PATCH /admin/settings/permissions** | Backend par confirm karo | Settings → Role Permissions save/load. |
| **Zones API** | Backend path confirm karo | Zone Management – abhi `/admin/zones` assume hai. |
| **Map locations API** | Backend par confirm karo | Dashboard map – abhi mock/fallback. |
| **OTP / Social login** | Swagger par hain, admin panel mein use nahi | Zarurat ho toh Sign-in par add kar sakte ho. |
| **Sessions revoke / Login history** | API ready, UI optional | Account/Security section mein “Active sessions”, “Login history” add kar sakte ho. |
| **Deactivate / Reactivate account** | Swagger par hain, admin mein use nahi | Account settings mein option add kar sakte ho. |

---

## 4. Backend paths (Swagger se match karke update karo)

- **Auth:** `/admin/auth/login`, `/auth/token/refresh`, `/admin/auth/forgot-password`, `/admin/auth/reset-password`, `/auth/me`, `/auth/change-password`
- **Customers:** `GET/PATCH /customers`, `GET /customers/:id`
- **Providers:** `GET /service-providers`, `GET /service-providers/:id`
- **Orders:** `GET /admin/orders`, `GET /admin/orders/:id`, `POST cancel, reassign, rebroadcast`
- **Roles:** `GET/POST/DELETE /roles`, `GET /roles/user/:userId`
- **Settings:** Backend par abhi **nahi** – isliye API key localStorage; baaki tabs jab backend add kare tab wire karna.
- **Zones:** `/admin/zones` (ya jo Swagger mein ho)
- **Map:** `/admin/map/locations` (ya jo Swagger mein ho)

Swagger link khol kar exact path aur request/response dekh kar `src/api/*.js` mein path/body update kar sakte ho.
