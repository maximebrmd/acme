<?php

namespace Peal\Partner\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelMove extends JsonSerializableType
{
    /**
     * @var string $toWorkspaceId
     */
    #[JsonProperty('toWorkspaceId')]
    public string $toWorkspaceId;

    /**
     * @param array{
     *   toWorkspaceId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->toWorkspaceId = $values['toWorkspaceId'];
    }
}
