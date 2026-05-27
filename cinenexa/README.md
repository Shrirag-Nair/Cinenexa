# 🎬 CineNexa

> A production-grade serverless movie streaming platform built with React and AWS.

![Architecture](./docs/architecture.png)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Vite, Zustand, Framer Motion |
| Auth | AWS Cognito (User Pools, JWT) |
| API | AWS API Gateway (REST) + Lambda Authorizer |
| Compute | AWS Lambda (Node.js 20.x) |
| Database | AWS DynamoDB (on-demand billing) |
| Storage | AWS S3 + CloudFront CDN |
| Movie Data | TMDB API |
| Monitoring | AWS CloudWatch |

---

## Project Structure

```
cinenexa/
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Navbar, Footer, Layout
│   │   │   ├── movie/          # HeroBanner, MovieCard, MovieRow, Skeletons
│   │   │   └── auth/           # Auth form components
│   │   ├── pages/              # Route pages
│   │   │   ├── HomePage.jsx
│   │   │   ├── BrowsePage.jsx
│   │   │   ├── MovieDetailPage.jsx
│   │   │   ├── SearchPage.jsx
│   │   │   ├── WatchlistPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── SignupPage.jsx
│   │   ├── store/              # Zustand state management
│   │   │   ├── authStore.js    # Auth state + Cognito integration
│   │   │   └── movieStore.js   # Movies + watchlist state
│   │   └── services/           # API service layer
│   │       ├── apiClient.js    # Axios + interceptors
│   │       ├── movieService.js
│   │       ├── watchlistService.js
│   │       └── userService.js
│   └── package.json
│
├── backend/
│   ├── lambdas/
│   │   ├── auth/               # Cognito PostConfirmation trigger
│   │   │   └── index.js        # Creates user profile on signup
│   │   ├── movies/             # Movie data from TMDB + DynamoDB cache
│   │   │   └── index.js        # trending, search, detail, genre, rate
│   │   ├── watchlist/          # User watchlist CRUD
│   │   │   └── index.js
│   │   ├── recommendations/    # AI recommendation engine
│   │   │   └── index.js        # Genre-affinity collaborative filtering
│   │   └── user/               # User profile + history
│   │       └── index.js
│   └── layers/
│       └── shared/             # Shared Lambda layer
│           └── nodejs/
│               ├── utils.js    # Response helpers, DynamoDB, TMDB client
│               └── package.json
│
└── infrastructure/             # AWS setup scripts (run once)
    ├── dynamodb/
    │   └── setup-dynamodb.js   # Creates all DynamoDB tables
    ├── cognito/
    │   └── setup-cognito.js    # Creates User Pool + App Client
    ├── s3/
    │   └── setup-s3.js         # Creates S3 buckets + CloudFront
    ├── apigateway/
    │   └── setup-apigateway.js # Creates REST API + all routes
    ├── deploy-lambdas.js       # Zips and deploys Lambda functions
    └── package.json
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- AWS CLI configured (`aws configure`)
- TMDB API key (free at [themoviedb.org](https://www.themoviedb.org/))
- AWS Account (Free Tier works)

### Step 1 — Install dependencies

```bash
npm run install:all
```

### Step 2 — Set environment variables

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012
export TMDB_API_KEY=your_tmdb_key_here
```

### Step 3 — Create IAM Role for Lambda

In the AWS Console, create a role named `cinenexa-lambda-role` with:
- `AWSLambdaBasicExecutionRole`
- `AmazonDynamoDBFullAccess`
- `CloudWatchLogsFullAccess`

### Step 4 — Run infrastructure setup (in order)

```bash
# 1. Create DynamoDB tables
npm run setup:db

# 2. Create Cognito User Pool
npm run setup:cognito
# → Copy VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID to frontend/.env

# 3. Create S3 + CloudFront
npm run setup:s3
# → Copy VITE_CLOUDFRONT_URL to frontend/.env

# 4. Deploy Lambda functions
npm run deploy:lambdas

# 5. Create API Gateway
npm run setup:api
# → Copy VITE_API_BASE_URL to frontend/.env
```

### Step 5 — Configure Cognito trigger

In AWS Console:
- Cognito → User Pools → cinenexa-users → User pool properties
- Triggers → Post confirmation → Select `cinenexa-auth` Lambda

### Step 6 — Set up frontend .env

```bash
cp frontend/.env.example frontend/.env
# Fill in the values output by the setup scripts
```

### Step 7 — Run locally

```bash
npm run dev
# Opens at http://localhost:3000
```

### Step 8 — Deploy frontend

```bash
npm run build
# Then sync to S3:
aws s3 sync frontend/dist/ s3://YOUR_BUCKET_NAME --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## DynamoDB Tables

| Table | PK | SK | Purpose |
|---|---|---|---|
| `cinenexa-users` | `userId` | — | User profiles |
| `cinenexa-watchlist` | `USER#{userId}` | `MOVIE#{movieId}` | Watchlists |
| `cinenexa-ratings` | `USER#{userId}` | `MOVIE#{movieId}` | Movie ratings |
| `cinenexa-interactions` | `USER#{userId}` | `{ts}#MOVIE#{id}` | Behavior tracking |
| `cinenexa-history` | `USER#{userId}` | `{ts}#MOVIE#{id}` | Watch history |
| `cinenexa-cache` | `cacheKey` | — | TMDB response cache |

---

## API Routes

### Movies (public)
| Method | Path | Description |
|---|---|---|
| GET | `/movies/trending` | Trending this week |
| GET | `/movies/top-rated` | Top rated all time |
| GET | `/movies/now-playing` | Now in cinemas |
| GET | `/movies/search?q=` | Search with query |
| GET | `/movies/genre?genreId=` | Browse by genre |
| GET | `/movies/{id}` | Movie detail + cast + videos |
| GET | `/movies/{id}/similar` | Similar movies |

### Watchlist (auth required)
| Method | Path | Description |
|---|---|---|
| GET | `/watchlist/{userId}` | Get watchlist |
| POST | `/watchlist/{userId}` | Add movie |
| DELETE | `/watchlist/{userId}/{movieId}` | Remove movie |

### Recommendations (public GET)
| Method | Path | Description |
|---|---|---|
| GET | `/recommendations/{userId}` | AI recommendations |
| POST | `/recommendations/record` | Record interaction |

### User (auth required)
| Method | Path | Description |
|---|---|---|
| GET | `/user/{userId}` | Get profile |
| PUT | `/user/{userId}` | Update profile |
| PUT | `/user/{userId}/preferences` | Update genre prefs |
| GET | `/user/{userId}/history` | Watch history |

---

## Recommendation Algorithm

The AI recommendations use **genre-affinity collaborative filtering**:

1. Fetch user's watchlist, ratings, and interaction history from DynamoDB
2. Build a genre preference score map:
   - Watchlisted movie genres: +1.5 weight
   - High ratings (>7): positive boost
   - Low ratings (<5): negative signal
   - View interactions: +0.5 weight
3. Pick top 3 genres
4. Fetch popular movies in those genres from TMDB
5. Score each candidate: `log(popularity) × 0.3 + genreAffinity × 2.0 + rating × 1.5`
6. Filter already-seen movies
7. Return top 20 ranked results

New users with no history get trending movies instead.

---

## Environment Variables

### Frontend (`frontend/.env`)
```
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_API_BASE_URL=https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/prod
VITE_CLOUDFRONT_URL=https://XXXXXXXXXXXX.cloudfront.net
```

### Lambda (set via AWS Console or deploy script)
```
TMDB_API_KEY=your_key
WATCHLIST_TABLE=cinenexa-watchlist
RATINGS_TABLE=cinenexa-ratings
USERS_TABLE=cinenexa-users
CACHE_TABLE=cinenexa-cache
INTERACTIONS_TABLE=cinenexa-interactions
HISTORY_TABLE=cinenexa-history
AWS_REGION=us-east-1
```

---

## Roadmap

### Phase 1 — Core (Current) ✅
- [x] React frontend with routing
- [x] AWS Cognito authentication
- [x] Movie browsing, search, detail
- [x] Watchlist management
- [x] AI recommendations
- [x] DynamoDB data layer
- [x] S3 + CloudFront hosting

### Phase 2 — Enhanced UX
- [ ] Continue watching progress tracking
- [ ] Multi-profile support
- [ ] Dark/light theme toggle
- [ ] Social ratings & reviews
- [ ] Push notifications

### Phase 3 — DevOps
- [ ] GitHub Actions CI/CD pipeline
- [ ] Terraform Infrastructure as Code
- [ ] DevSecOps security scanning
- [ ] Centralized CloudWatch dashboards
- [ ] Docker local development
- [ ] Performance caching with ElastiCache

---

## Free Tier Usage

This project is designed to run within the AWS Free Tier:

| Service | Free Tier Limit | Usage |
|---|---|---|
| Lambda | 1M req/month | Well within for dev |
| DynamoDB | 25 GB storage, 25 RCU/WCU | Well within for dev |
| S3 | 5 GB, 20K GET | Well within for dev |
| CloudFront | 1 TB data, 10M req | Well within for dev |
| Cognito | 50K MAU | Well within for dev |
| API Gateway | 1M calls/month | Well within for dev |

> **Note:** TMDB API is free with registration at themoviedb.org.
