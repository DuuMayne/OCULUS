.PHONY: install lint format security test check clean

install:
	cd backend && pip install -r requirements.txt
	pip install ruff bandit pytest pre-commit
	pre-commit install

lint:
	ruff check backend/app/ backend/tests/
	ruff format --check backend/app/ backend/tests/

format:
	ruff check --fix backend/app/ backend/tests/
	ruff format backend/app/ backend/tests/

security:
	bandit -r backend/app/ -s B101

test:
	cd backend && python -m pytest tests/ -v --tb=short

check: lint security test
	@echo "\n✓ All checks passed"

clean:
	rm -rf .pytest_cache .ruff_cache
	find . -type d -name __pycache__ -not -path "./.venv/*" -exec rm -rf {} + 2>/dev/null || true

# Frontend
lint-frontend:
	cd frontend && npx tsc --noEmit

dev:
	cd frontend && npm run dev
