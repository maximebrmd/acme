<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WorkspaceReport extends JsonSerializableType
{
    /**
     * @var ?WorkspaceAnalytics $analytics
     */
    #[JsonProperty('analytics')]
    public ?WorkspaceAnalytics $analytics;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?value-of<OverviewRefusal> $refused
     */
    #[JsonProperty('refused')]
    public ?string $refused;

    /**
     * @var string $role
     */
    #[JsonProperty('role')]
    public string $role;

    /**
     * @var string $slug
     */
    #[JsonProperty('slug')]
    public string $slug;

    /**
     * @param array{
     *   id: string,
     *   name: string,
     *   role: string,
     *   slug: string,
     *   analytics?: ?WorkspaceAnalytics,
     *   refused?: ?value-of<OverviewRefusal>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->analytics = $values['analytics'] ?? null;
        $this->id = $values['id'];
        $this->name = $values['name'];
        $this->refused = $values['refused'] ?? null;
        $this->role = $values['role'];
        $this->slug = $values['slug'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
