# SuperApp — Personal Management Platform

SuperApp is a comprehensive, all-in-one personal management solution designed to enhance productivity and organize daily life.

## 📂 Project Structure

The project is organized as a multi-service monorepo, with each service designed to be eventually separated into its own repository.

- **[web/](./web)**: Next.js 14 web application (Frontend).
- **[mobile/](./mobile)**: Expo / React Native application (Android/iOS).
- **[backend/](./backend)**: Golang-based API service (Experimental).
- **[shared/](./shared)**: Shared logic, utilities, and types used across web and mobile.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm 9+
- Go 1.22+ (for backend)

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/joeinus134131/superapp.git
   cd superapp
   ```
2. **Install dependencies**
   ```bash
   pnpm install
   ```

### Running Services
- **Web**: `npm run dev:web`
- **Mobile**: `npm run dev:mobile`
- **Backend**: `cd backend && go run cmd/api/main.go`

## 📱 Mobile App
For detailed instructions on running the mobile app, see [mobile/README.md](./mobile/README.md) or use the quick start script:
```bash
./START_MOBILE.sh
```

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
