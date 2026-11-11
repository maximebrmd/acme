<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;

class UnpublishTargetPostsRequest extends JsonSerializableType
{
    /**
     * @var ?string $wait
     */
    public ?string $wait;

    /**
     * @param array{
     *   wait?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->wait = $values['wait'] ?? null;
    }
}
