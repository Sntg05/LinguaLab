# Generates the reference values for the noncentral t, chi-squared and F
# distributions and for the confidence intervals of Cohen's d, eta-squared and
# Cramer's V (packages/core/src/stats/intervals.test.ts).
#
# Two references, on purpose:
# - "exact": the same intervals effectsize computes (ncp method, Steiger 2004),
#   but solving for the noncentrality parameter with uniroot at 1e-13 on R's own
#   pt/pchisq/pf. The site must match these closely.
# - "effectsize": what effectsize 1.0.3 prints. It finds the parameter with
#   Nelder-Mead (optim), which stops early, so the site only has to agree with it
#   to a looser tolerance. Both are written so the difference is visible.
#
# Needs R and effectsize (it can live in a temporary library):
#   R_LIBS_USER=<dir> Rscript -e 'install.packages("effectsize", lib = "<dir>")'
#   R_LIBS_USER=<dir> Rscript scripts/r/build-noncentral-reference.R
# Output: packages/core/src/stats/noncentral-reference.ts (versioned).

suppressMessages(library(effectsize))
num <- function(x) sprintf("%.17g", x)

cdf_rows <- c()
for (case in list(c(2.1, 10, 1.5), c(-1.3, 5, 0.7), c(0.5, 30, -2), c(4, 18, 3.2), c(-3, 12, -4.5))) {
  cdf_rows <- c(cdf_rows, sprintf("  { dist: \"t\", x: %s, df: %s, ncp: %s, p: %s },",
    num(case[1]), num(case[2]), num(case[3]), num(pt(case[1], case[2], case[3]))))
}
for (case in list(c(3, 2, 1.5), c(12, 6, 4), c(25.3, 6, 10), c(0.8, 1, 0.3), c(40, 10, 25))) {
  cdf_rows <- c(cdf_rows, sprintf("  { dist: \"chisq\", x: %s, df: %s, ncp: %s, p: %s },",
    num(case[1]), num(case[2]), num(case[3]), num(pchisq(case[1], case[2], case[3]))))
}
for (case in list(c(2, 3, 20, 4), c(5.5, 2, 147, 20), c(0.7, 4, 10, 1), c(119.26, 2, 147, 230))) {
  cdf_rows <- c(cdf_rows, sprintf("  { dist: \"f\", x: %s, df: %s, df2: %s, ncp: %s, p: %s },",
    num(case[1]), num(case[2]), num(case[3]), num(case[4]), num(pf(case[1], case[2], case[3], case[4]))))
}

root <- function(f, lower, upper) uniroot(f, c(lower, upper), tol = 1e-13, maxiter = 10000)$root
ncp_t <- function(t, df, p) root(function(d) pt(t, df, d) - p, t - 50, t + 50)
ncp_pos <- function(cdf, p) if (cdf(0) <= p) 0 else root(function(l) cdf(l) - p, 0, 10000)

auto <- mtcars$mpg[mtcars$am == 0]; manual <- mtcars$mpg[mtcars$am == 1]
s1 <- sleep$extra[1:10]; s2 <- sleep$extra[11:20]
tab <- unclass(table(mtcars$cyl, mtcars$am))
fit <- aov(Sepal.Length ~ Species, data = iris)

ci_rows <- c()
add_ci <- function(name, exact, es) {
  ci_rows <<- c(ci_rows, sprintf("  { name: \"%s\", low: %s, high: %s, effectsizeLow: %s, effectsizeHigh: %s },",
    name, num(exact[1]), num(exact[2]), num(es[1]), num(es[2])))
}

# d with pooled sd, two-sided 95 %.
n1 <- length(auto); n2 <- length(manual); se <- sqrt(1 / n1 + 1 / n2)
d <- cohens_d(auto, manual); t <- d$Cohens_d / se
add_ci("cohens_d_pooled", c(ncp_t(t, n1 + n2 - 2, 0.975), ncp_t(t, n1 + n2 - 2, 0.025)) * se, c(d$CI_low, d$CI_high))

# d_z of paired data and d of one sample: t = d * sqrt(n).
dz <- cohens_d(s1, s2, paired = TRUE); n <- length(s1); t <- dz$Cohens_d * sqrt(n)
add_ci("cohens_d_paired", c(ncp_t(t, n - 1, 0.975), ncp_t(t, n - 1, 0.025)) / sqrt(n), c(dz$CI_low, dz$CI_high))
d1 <- cohens_d(mtcars$mpg, mu = 20); n <- length(mtcars$mpg); t <- d1$Cohens_d * sqrt(n)
add_ci("cohens_d_one_sample", c(ncp_t(t, n - 1, 0.975), ncp_t(t, n - 1, 0.025)) / sqrt(n), c(d1$CI_low, d1$CI_high))

# eta-squared of a one-way ANOVA: one-sided ("greater") 95 %, so the bound
# solves P(F <= f; lambda) = 0.95 and the upper end is 1.
e <- eta_squared(fit, verbose = FALSE); s <- summary(fit)[[1]]
f <- s$`F value`[1]; df1 <- s$Df[1]; df2 <- s$Df[2]
lambda <- ncp_pos(function(l) pf(f, df1, df2, l), 0.95)
# effectsize turns the bound into an F (lambda / df1) and back: eta2 = lambda / (lambda + df2).
add_ci("eta_squared", c(lambda / (lambda + df2), 1), c(e$CI_low, e$CI_high))

# Cramer's V, one-sided ("greater") 95 %, with and without Bergsma's correction.
chi <- suppressWarnings(chisq.test(tab, correct = FALSE)$statistic); N <- sum(tab)
r <- nrow(tab); k <- ncol(tab); df <- (r - 1) * (k - 1)
lambda <- ncp_pos(function(l) pchisq(chi, df, l), 0.95)
raw <- cramers_v(tab, adjust = FALSE)
add_ci("cramers_v_raw", c(sqrt(lambda / N) / sqrt(min(r - 1, k - 1)), 1), c(raw$CI_low, raw$CI_high))
adj <- cramers_v(tab)
kk <- r - (r - 1)^2 / (N - 1); ll <- k - (k - 1)^2 / (N - 1)
phi_low <- sqrt(max(0, lambda / N - df / (N - 1)))
add_ci("cramers_v_adjusted", c(phi_low / sqrt(min(kk - 1, ll - 1)), 1), c(adj$CI_low, adj$CI_high))

# A table where the corrected lower bound is not clipped to 0.
tab3 <- matrix(c(30, 10, 12, 8, 25, 9, 5, 7, 28), nrow = 3)
chi <- suppressWarnings(chisq.test(tab3, correct = FALSE)$statistic); N <- sum(tab3)
r <- nrow(tab3); k <- ncol(tab3); df <- (r - 1) * (k - 1)
lambda <- ncp_pos(function(l) pchisq(chi, df, l), 0.95)
adj3 <- cramers_v(tab3)
kk <- r - (r - 1)^2 / (N - 1); ll <- k - (k - 1)^2 / (N - 1)
phi_low <- sqrt(max(0, lambda / N - df / (N - 1)))
add_ci("cramers_v_adjusted_3x3", c(phi_low / sqrt(min(kk - 1, ll - 1)), 1), c(adj3$CI_low, adj3$CI_high))

out <- "packages/core/src/stats/noncentral-reference.ts"
writeLines(c(
  "// Generated by scripts/r/build-noncentral-reference.R. Do not edit by hand.",
  paste0("// ", R.version.string, "; effectsize ", as.character(packageVersion("effectsize")), "."),
  "// biome-ignore-all lint/correctness/noPrecisionLoss: R prints 17 significant digits; the reference is kept exactly as R wrote it.",
  "",
  "export interface NoncentralCdfCase {",
  "  readonly dist: \"t\" | \"chisq\" | \"f\";",
  "  readonly x: number;",
  "  readonly df: number;",
  "  readonly df2?: number;",
  "  readonly ncp: number;",
  "  readonly p: number;",
  "}",
  "",
  "export const NONCENTRAL_CDF_REFERENCE: readonly NoncentralCdfCase[] = [", cdf_rows, "];",
  "",
  "export interface IntervalCase {",
  "  readonly name: string;",
  "  readonly low: number;",
  "  readonly high: number;",
  "  readonly effectsizeLow: number;",
  "  readonly effectsizeHigh: number;",
  "}",
  "",
  "export const INTERVAL_REFERENCE: readonly IntervalCase[] = [", ci_rows, "];"
), out)
cat("wrote", out, "\n")
