<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WorkspaceBusyEncoded extends JsonSerializableType
{
    /**
     * @var value-of<WorkspaceBusyEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var string $workspaceId
     */
    #[JsonProperty('workspaceId')]
    public string $workspaceId;

    /**
     * @param array{
     *   tag: value-of<WorkspaceBusyEncodedTag>,
     *   workspaceId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->workspaceId = $values['workspaceId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
