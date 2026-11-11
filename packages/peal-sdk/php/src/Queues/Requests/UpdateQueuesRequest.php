<?php

namespace Peal\Queues\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\QueueDetails;

class UpdateQueuesRequest extends JsonSerializableType
{
    /**
     * @var QueueDetails $body
     */
    public QueueDetails $body;

    /**
     * @param array{
     *   body: QueueDetails,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
