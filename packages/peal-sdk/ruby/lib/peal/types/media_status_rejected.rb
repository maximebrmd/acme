# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaStatusRejected < Internal::Types::Model
      field :reason, -> { Peal::Types::RejectionReason }, optional: false, nullable: false
    end
  end
end
