# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AdAuditAction
      extend Peal::Internal::Types::Enum

      ACCOUNT_CONNECTED = "accountConnected"
      ACCOUNT_DISCONNECTED = "accountDisconnected"
      SPENDING_ENABLED = "spendingEnabled"
      SPENDING_DISABLED = "spendingDisabled"
      CEILING_CHANGED = "ceilingChanged"
      BOOST_REQUESTED = "boostRequested"
      BOOST_STARTED = "boostStarted"
      BOOST_UNCONFIRMED = "boostUnconfirmed"
      BOOST_FAILED = "boostFailed"
      BOOST_PAUSED = "boostPaused"
      BOOST_RESUMED = "boostResumed"
      BOOST_STOPPED = "boostStopped"
      BOOST_ENDED = "boostEnded"
    end
  end
end
