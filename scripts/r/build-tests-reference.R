# Generates the R reference values for the hypothesis tests of the statistics
# engine (packages/core/src/stats/tests.test.ts). Base R only; the data ship
# with R. Usage: Rscript scripts/r/build-tests-reference.R
# Output: packages/core/src/stats/tests-reference.ts (versioned).

num <- function(x) ifelse(is.finite(x), sprintf("%.17g", x), "null")
vec <- function(v) paste0("[", paste(vapply(v, num, ""), collapse = ", "), "]")
mat <- function(m) paste0("[", paste(apply(m, 1, vec), collapse = ", "), "]")
cases <- character(0)
add <- function(name, kind, input, result) {
  cases <<- c(cases, sprintf("  { name: \"%s\", kind: \"%s\", input: %s, result: %s },", name, kind, input, result))
}
ht <- function(r, extra = "") sprintf(
  "{ statistic: %s, df: %s, p: %s, estimate: %s, ci: %s%s }",
  num(unname(r$statistic)), num(if (is.null(r$parameter)) NA else unname(r$parameter[1])), num(r$p.value),
  vec(unname(r$estimate)), vec(if (is.null(r$conf.int)) c(NA, NA) else unname(r$conf.int)), extra)

sleep1 <- sleep$extra[sleep$group == 1]; sleep2 <- sleep$extra[sleep$group == 2]
mpg_auto <- mtcars$mpg[mtcars$am == 0]; mpg_manual <- mtcars$mpg[mtcars$am == 1]

for (alt in c("two.sided", "less", "greater")) {
  add(paste0("one_sample_", alt), "tOne", sprintf("{ x: %s, mu: 20, alternative: \"%s\" }", vec(mtcars$mpg), alt),
      ht(t.test(mtcars$mpg, mu = 20, alternative = alt)))
  add(paste0("welch_", alt), "tWelch", sprintf("{ x: %s, y: %s, alternative: \"%s\" }", vec(mpg_auto), vec(mpg_manual), alt),
      ht(t.test(mpg_auto, mpg_manual, alternative = alt)))
}
add("student_equal_var", "tStudent", sprintf("{ x: %s, y: %s, alternative: \"two.sided\" }", vec(mpg_auto), vec(mpg_manual)),
    ht(t.test(mpg_auto, mpg_manual, var.equal = TRUE)))
add("paired_sleep", "tPaired", sprintf("{ x: %s, y: %s, alternative: \"two.sided\" }", vec(sleep1), vec(sleep2)),
    ht(t.test(sleep1, sleep2, paired = TRUE)))

# Chi-square: independence (with Yates for 2x2, as R by default) and goodness of fit.
tab <- table(mtcars$cyl, mtcars$am)
r <- suppressWarnings(chisq.test(tab))
add("chisq_cyl_am", "chiIndependence", sprintf("{ table: %s, correct: true }", mat(unclass(tab))),
    sprintf("{ statistic: %s, df: %s, p: %s, expected: %s }", num(unname(r$statistic)), num(unname(r$parameter)), num(r$p.value), mat(r$expected)))
tab2 <- matrix(c(12, 5, 7, 16), nrow = 2)
for (correct in c(TRUE, FALSE)) {
  r <- chisq.test(tab2, correct = correct)
  add(paste0("chisq_2x2_", tolower(correct)), "chiIndependence", sprintf("{ table: %s, correct: %s }", mat(tab2), tolower(correct)),
      sprintf("{ statistic: %s, df: %s, p: %s, expected: %s }", num(unname(r$statistic)), num(unname(r$parameter)), num(r$p.value), mat(r$expected)))
}
die <- c(22, 17, 20, 26, 22, 13)
r <- chisq.test(die)
add("gof_uniform", "chiGoodness", sprintf("{ observed: %s, expected: null }", vec(die)),
    sprintf("{ statistic: %s, df: %s, p: %s }", num(unname(r$statistic)), num(unname(r$parameter)), num(r$p.value)))
probs <- c(0.1, 0.2, 0.3, 0.4); obs <- c(14, 25, 26, 35)
r <- chisq.test(obs, p = probs)
add("gof_given", "chiGoodness", sprintf("{ observed: %s, expected: %s }", vec(obs), vec(probs)),
    sprintf("{ statistic: %s, df: %s, p: %s }", num(unname(r$statistic)), num(unname(r$parameter)), num(r$p.value)))

# Correlations. Spearman with exact = FALSE: the t approximation R uses with ties.
r <- cor.test(mtcars$mpg, mtcars$wt)
add("pearson_mpg_wt", "pearson", sprintf("{ x: %s, y: %s }", vec(mtcars$mpg), vec(mtcars$wt)), ht(r))
r <- suppressWarnings(cor.test(mtcars$mpg, mtcars$wt, method = "spearman", exact = FALSE))
add("spearman_mpg_wt", "spearman", sprintf("{ x: %s, y: %s }", vec(mtcars$mpg), vec(mtcars$wt)),
    sprintf("{ statistic: %s, df: null, p: %s, estimate: %s, ci: [null, null] }", num(unname(r$statistic)), num(r$p.value), vec(unname(r$estimate))))

# One-way ANOVA.
fit <- summary(aov(Sepal.Length ~ Species, data = iris))[[1]]
groups <- split(iris$Sepal.Length, iris$Species)
add("anova_iris", "anova", sprintf("{ groups: [%s] }", paste(vapply(groups, vec, ""), collapse = ", ")),
    sprintf("{ statistic: %s, df: %s, df2: %s, p: %s, ssBetween: %s, ssWithin: %s }",
            num(fit$`F value`[1]), num(fit$Df[1]), num(fit$Df[2]), num(fit$`Pr(>F)`[1]), num(fit$`Sum Sq`[1]), num(fit$`Sum Sq`[2])))

# Rank tests: exact without ties (n < 50), normal approximation with ties.
a <- c(1.83, 0.50, 1.62, 2.48, 1.68, 1.88, 1.55, 3.06, 1.30)
b <- c(0.878, 0.647, 0.598, 2.05, 1.06, 1.29, 1.06, 3.14, 1.29)
x_exact <- c(0.8, 0.83, 1.89, 1.04, 1.45, 1.38, 1.91, 1.64, 0.73, 1.46)
y_exact <- c(1.15, 0.88, 0.90, 0.74, 1.21)
for (alt in c("two.sided", "less", "greater")) {
  r <- wilcox.test(x_exact, y_exact, alternative = alt)
  add(paste0("mann_whitney_exact_", alt), "mannWhitney", sprintf("{ x: %s, y: %s, alternative: \"%s\" }", vec(x_exact), vec(y_exact), alt),
      sprintf("{ statistic: %s, p: %s, exact: true }", num(unname(r$statistic)), num(r$p.value)))
  r <- wilcox.test(a, b, paired = TRUE, alternative = alt)
  add(paste0("signed_rank_exact_", alt), "signedRank", sprintf("{ x: %s, y: %s, alternative: \"%s\" }", vec(a), vec(b), alt),
      sprintf("{ statistic: %s, p: %s, exact: true }", num(unname(r$statistic)), num(r$p.value)))
}
r <- suppressWarnings(wilcox.test(mpg_auto, mpg_manual))
add("mann_whitney_ties", "mannWhitney", sprintf("{ x: %s, y: %s, alternative: \"two.sided\" }", vec(mpg_auto), vec(mpg_manual)),
    sprintf("{ statistic: %s, p: %s, exact: false }", num(unname(r$statistic)), num(r$p.value)))
r <- suppressWarnings(wilcox.test(sleep1, sleep2, paired = TRUE))
add("signed_rank_ties", "signedRank", sprintf("{ x: %s, y: %s, alternative: \"two.sided\" }", vec(sleep1), vec(sleep2)),
    sprintf("{ statistic: %s, p: %s, exact: false }", num(unname(r$statistic)), num(r$p.value)))

out <- "packages/core/src/stats/tests-reference.ts"
writeLines(c(
  "// Generated by scripts/r/build-tests-reference.R. Do not edit by hand.",
  paste0("// ", R.version.string, "; base R only."),
  "// biome-ignore-all lint/correctness/noPrecisionLoss: R prints 17 significant digits; the reference is kept exactly as R wrote it.",
  "// biome-ignore-all lint/suspicious/noExplicitAny: each case carries the input and result shape of its own test.",
  "",
  "export interface TestCase {",
  "  readonly name: string;",
  "  readonly kind: string;",
  "  readonly input: any;",
  "  readonly result: any;",
  "}",
  "",
  "export const TESTS_REFERENCE: readonly TestCase[] = [", cases, "];"
), out)
cat("wrote", out, length(cases), "cases\n")
