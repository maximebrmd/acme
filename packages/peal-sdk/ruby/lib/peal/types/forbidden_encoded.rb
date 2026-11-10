# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ForbiddenEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::ForbiddenEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :permission, -> { Peal::Types::Permission }, optional: true, nullable: false

      field :reason, -> { Peal::Types::ForbiddenReason }, optional: true, nullable: false

      field :scope, -> { String }, optional: true, nullable: false
    end
  end
end
