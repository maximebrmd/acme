# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaInUseEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::MediaInUseEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :post_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "postIds"

      field :article_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "articleIds"
    end
  end
end
