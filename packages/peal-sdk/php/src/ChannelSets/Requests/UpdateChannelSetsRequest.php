<?php

namespace Peal\ChannelSets\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\ChannelSetDetails;

class UpdateChannelSetsRequest extends JsonSerializableType
{
    /**
     * @var ChannelSetDetails $body
     */
    public ChannelSetDetails $body;

    /**
     * @param array{
     *   body: ChannelSetDetails,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
