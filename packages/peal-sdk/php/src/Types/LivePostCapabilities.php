<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class LivePostCapabilities extends JsonSerializableType
{
    /**
     * @var bool $edit
     */
    #[JsonProperty('edit')]
    public bool $edit;

    /**
     * @var ?value-of<LivePostBlocker> $editBlockedBy
     */
    #[JsonProperty('editBlockedBy')]
    public ?string $editBlockedBy;

    /**
     * @var bool $unpublish
     */
    #[JsonProperty('unpublish')]
    public bool $unpublish;

    /**
     * @var ?value-of<LivePostBlocker> $unpublishBlockedBy
     */
    #[JsonProperty('unpublishBlockedBy')]
    public ?string $unpublishBlockedBy;

    /**
     * @param array{
     *   edit: bool,
     *   unpublish: bool,
     *   editBlockedBy?: ?value-of<LivePostBlocker>,
     *   unpublishBlockedBy?: ?value-of<LivePostBlocker>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->edit = $values['edit'];
        $this->editBlockedBy = $values['editBlockedBy'] ?? null;
        $this->unpublish = $values['unpublish'];
        $this->unpublishBlockedBy = $values['unpublishBlockedBy'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
