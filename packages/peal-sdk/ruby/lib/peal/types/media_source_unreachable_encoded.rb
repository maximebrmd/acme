# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaSourceUnreachableEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :reason, -> { Peal::Types::MediaSourceFailure }, optional: false, nullable: false

      field :status, -> { Integer }, optional: false, nullable: true
    end
  end
end
