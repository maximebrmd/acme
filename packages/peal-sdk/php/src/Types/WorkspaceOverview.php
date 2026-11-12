<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WorkspaceOverview extends JsonSerializableType
{
    /**
     * @var ?OverviewChannels $channels
     */
    #[JsonProperty('channels')]
    public ?OverviewChannels $channels;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?OverviewInbox $inbox
     */
    #[JsonProperty('inbox')]
    public ?OverviewInbox $inbox;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?bool $overPlan
     */
    #[JsonProperty('overPlan')]
    public ?bool $overPlan;

    /**
     * @var ?OverviewPosts $posts
     */
    #[JsonProperty('posts')]
    public ?OverviewPosts $posts;

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
     *   channels?: ?OverviewChannels,
     *   inbox?: ?OverviewInbox,
     *   overPlan?: ?bool,
     *   posts?: ?OverviewPosts,
     *   refused?: ?value-of<OverviewRefusal>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channels = $values['channels'] ?? null;
        $this->id = $values['id'];
        $this->inbox = $values['inbox'] ?? null;
        $this->name = $values['name'];
        $this->overPlan = $values['overPlan'] ?? null;
        $this->posts = $values['posts'] ?? null;
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
