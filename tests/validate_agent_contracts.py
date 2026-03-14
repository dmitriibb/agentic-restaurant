from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def assert_contains(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise AssertionError(f"{label} is missing required text: {needle}")


def main() -> None:
    pipeline_yaml = read_text("agent/pipeline.yaml")
    agents_md = read_text("AGENTS.md")
    agent_readme = read_text("agent/README.md")
    implementation_template = read_text("agent/tasks/TASK_TEMPLATE.md")
    architecture_template = read_text("agent/tasks/ARCHITECTURE_TASK_TEMPLATE.md")
    task_splitter = read_text("agent/task-splitter/AGENT.md")

    for required in [
        "pipelines:",
        "implementation:",
        "architecture:",
        "task_splitter",
        "pipeline_selection:",
        "future_pipelines:",
        "e2e:",
    ]:
        assert_contains(pipeline_yaml, required, "agent/pipeline.yaml")

    implementation_block = pipeline_yaml.split("  implementation:\n", 1)[1].split("  architecture:\n", 1)[0]
    architecture_block = pipeline_yaml.split("  architecture:\n", 1)[1].split("pipeline_selection:\n", 1)[0]

    for required in [
        "      - supervisor",
        "      - planner",
        "      - coder",
        "      - tester",
        "      - reviewer",
        "      - pull_request",
        "      - done",
    ]:
        assert_contains(implementation_block, required, "implementation pipeline")

    if "      - architect" in implementation_block:
        raise AssertionError("implementation pipeline must not include architect")

    for required in [
        "      - supervisor",
        "      - architect",
        "      - task_splitter",
        "      - done",
        "split_report:",
    ]:
        assert_contains(architecture_block, required, "architecture pipeline")

    for required in [
        "pipeline: implementation",
        "source_architecture:",
        "Do not create implementation task ids with letter suffixes",
    ]:
        assert_contains(implementation_template, required, "agent/tasks/TASK_TEMPLATE.md")

    for required in [
        "pipeline: architecture",
        "architecture: required",
        "Generated implementation tasks use standalone numeric ids",
    ]:
        assert_contains(architecture_template, required, "agent/tasks/ARCHITECTURE_TASK_TEMPLATE.md")

    for required in [
        "task-splitter",
        "Architecture pipeline:",
        "pipeline: architecture",
        "pipeline: implementation",
    ]:
        assert_contains(agents_md, required, "AGENTS.md")

    for required in [
        "Task Splitter",
        "Do not create `task-009-A`",
        "The e2e pipeline is intentionally not implemented yet",
    ]:
        assert_contains(agent_readme, required, "agent/README.md")

    for required in [
        "Working as task-splitter agent.",
        "Never create letter-suffixed child ids",
        "source_architecture",
    ]:
        assert_contains(task_splitter, required, "agent/task-splitter/AGENT.md")


if __name__ == "__main__":
    main()
