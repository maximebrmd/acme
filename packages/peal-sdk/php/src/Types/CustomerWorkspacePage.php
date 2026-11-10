<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class CustomerWorkspacePage extends JsonSerializableType
{
    /**
     * @var ?string $next
     */
    #[JsonProperty('next')]
    public ?string $next;

    /**
     * @var int $total
     */
    #[JsonProperty('total')]
    public int $total;

    /**
     * @var array<CustomerWorkspace> $workspaces
     */
    #[JsonProperty('workspaces'), ArrayType([CustomerWorkspace::class])]
    public array $workspaces;

    /**
     * @param array{
     *   total: int,
     *   workspaces: array<CustomerWorkspace>,
     *   next?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->next = $values['next'] ?? null;
        $this->total = $values['total'];
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
