# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnknownTagsEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::UnknownTagsEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :tag_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "tagIds"
    end
  end
end
