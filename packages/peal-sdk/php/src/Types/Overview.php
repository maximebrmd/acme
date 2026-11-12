<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Overview extends JsonSerializableType
{
    /**
     * @var string $generatedAt
     */
    #[JsonProperty('generatedAt')]
    public string $generatedAt;

    /**
     * @var ?string $nextCursor
     */
    #[JsonProperty('nextCursor')]
    public ?string $nextCursor;

    /**
     * @var array<WorkspaceOverview> $workspaces
     */
    #[JsonProperty('workspaces'), ArrayType([WorkspaceOverview::class])]
    public array $workspaces;

    /**
     * @param array{
     *   generatedAt: string,
     *   workspaces: array<WorkspaceOverview>,
     *   nextCursor?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->generatedAt = $values['generatedAt'];
        $this->nextCursor = $values['nextCursor'] ?? null;
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
