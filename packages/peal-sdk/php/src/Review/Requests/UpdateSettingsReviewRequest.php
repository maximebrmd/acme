<?php

namespace Peal\Review\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\ReviewSettings;

class UpdateSettingsReviewRequest extends JsonSerializableType
{
    /**
     * @var ReviewSettings $body
     */
    public ReviewSettings $body;

    /**
     * @param array{
     *   body: ReviewSettings,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
