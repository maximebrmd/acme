# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventAllowanceReached < Internal::Types::Model
      field :allowed, -> { Integer }, optional: false, nullable: false

      field :meter, -> { Peal::Types::Meter }, optional: false, nullable: false

      field :resets_at, -> { String }, optional: false, nullable: false, api_name: "resetsAt"
    end
  end
end
