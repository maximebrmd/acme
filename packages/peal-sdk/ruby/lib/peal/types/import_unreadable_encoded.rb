# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportUnreadableEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::ImportUnreadableEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :column, -> { String }, optional: false, nullable: true

      field :problem, -> { Peal::Types::ImportProblem }, optional: false, nullable: false
    end
  end
end
