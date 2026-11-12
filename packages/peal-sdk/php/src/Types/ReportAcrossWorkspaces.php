<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ReportAcrossWorkspaces extends JsonSerializableType
{
    /**
     * @var string $from
     */
    #[JsonProperty('from')]
    public string $from;

    /**
     * @var ?string $nextCursor
     */
    #[JsonProperty('nextCursor')]
    public ?string $nextCursor;

    /**
     * @var ReportAcrossWorkspacesPrevious $previous
     */
    #[JsonProperty('previous')]
    public ReportAcrossWorkspacesPrevious $previous;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

    /**
     * @var string $to
     */
    #[JsonProperty('to')]
    public string $to;

    /**
     * @var array<WorkspaceReport> $workspaces
     */
    #[JsonProperty('workspaces'), ArrayType([WorkspaceReport::class])]
    public array $workspaces;

    /**
     * @param array{
     *   from: string,
     *   previous: ReportAcrossWorkspacesPrevious,
     *   timeZone: string,
     *   to: string,
     *   workspaces: array<WorkspaceReport>,
     *   nextCursor?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->from = $values['from'];
        $this->nextCursor = $values['nextCursor'] ?? null;
        $this->previous = $values['previous'];
        $this->timeZone = $values['timeZone'];
        $this->to = $values['to'];
        $this->workspaces = $values['workspaces'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
